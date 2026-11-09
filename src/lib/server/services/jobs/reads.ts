/**
 * Job reads: public search, job detail and the employer's own job list.
 */
import { and, arrayOverlaps, count, desc, eq, gte, lte, or, sql, type SQL } from 'drizzle-orm';
import { TIME_OF_DAY_RANGES, type TimeOfDay } from '#lib/schedule.ts';
import type { Database } from '#lib/server/db/types.ts';
import {
	applications,
	categories,
	employerProfiles,
	jobs,
	locations
} from '#lib/server/db/product.schema.ts';
import {
	jobDetailSelection,
	jobSummarySelection,
	myJobSelection,
	type JobDetailRecord,
	type JobPage,
	type JobSearchFilters,
	type JobSortOrder,
	type MyJobListOptions,
	type MyJobPage
} from './selections.ts';

/** Returns one page of an employer's own jobs, newest first. */
export async function listEmployerJobs(
	database: Database,
	options: MyJobListOptions
): Promise<MyJobPage> {
	const conditions: SQL[] = [eq(jobs.employerId, options.employerId)];

	if (options.status !== undefined) {
		conditions.push(eq(jobs.status, options.status));
	}

	const filters = and(...conditions);

	const [items, totalRows] = await Promise.all([
		database
			.select(myJobSelection)
			.from(jobs)
			.innerJoin(categories, eq(categories.id, jobs.categoryId))
			.innerJoin(locations, eq(locations.id, jobs.locationId))
			.leftJoin(employerProfiles, eq(employerProfiles.userId, jobs.employerId))
			.where(filters)
			.orderBy(desc(jobs.createdAt), desc(jobs.id))
			.limit(options.limit)
			.offset(options.offset),
		database.select({ total: count() }).from(jobs).where(filters)
	]);

	return {
		items,
		total: totalRows[0]?.total ?? 0
	};
}

/**
 * Searches open, visible jobs.
 *
 * Every filter combines with AND. `query` uses the full-text index over title
 * and description.
 *
 * @param filters - The parsed public search filters and pagination.
 * @returns The requested page and the total number of matching jobs.
 */
export async function searchOpenJobs(
	database: Database,
	filters: JobSearchFilters
): Promise<JobPage> {
	const conditions = buildSearchConditions(filters);

	const [items, totalRows] = await Promise.all([
		database
			.select(jobSummarySelection)
			.from(jobs)
			.innerJoin(categories, eq(categories.id, jobs.categoryId))
			.innerJoin(locations, eq(locations.id, jobs.locationId))
			.leftJoin(employerProfiles, eq(employerProfiles.userId, jobs.employerId))
			.where(and(...conditions))
			.orderBy(...orderByForSearch(filters.sort))
			.limit(filters.limit)
			.offset(filters.offset),
		// The join is only needed for `verifiedOnly`, but keeping it here lets both
		// queries share one condition list, so the page and the total cannot drift.
		database
			.select({ total: count() })
			.from(jobs)
			.leftJoin(employerProfiles, eq(employerProfiles.userId, jobs.employerId))
			.where(and(...conditions))
	]);

	return {
		items,
		total: totalRows[0]?.total ?? 0
	};
}

/** Returns a job with its long-form fields, including hidden jobs. */
export async function findJobDetail(
	database: Database,
	jobId: string
): Promise<JobDetailRecord | null> {
	const [job] = await database
		.select(jobDetailSelection)
		.from(jobs)
		.innerJoin(categories, eq(categories.id, jobs.categoryId))
		.innerJoin(locations, eq(locations.id, jobs.locationId))
		.leftJoin(employerProfiles, eq(employerProfiles.userId, jobs.employerId))
		.where(eq(jobs.id, jobId))
		.limit(1);

	return job ?? null;
}

/**
 * Builds the `WHERE` conditions for the public job search.
 *
 * This function does not execute a query. It returns SQL fragments, and
 * `searchOpenJobs` combines them with `and(...)` for both the page and the
 * total count, so the list and the total cannot drift.
 *
 * Every optional filter is added only when the caller provides it. A caller
 * that uses `verifiedOnly` must join `employerProfiles`.
 *
 * @param filters - The parsed public search filters.
 * @returns The AND-combined `WHERE` conditions for the page and total query.
 */
function buildSearchConditions(filters: JobSearchFilters): SQL[] {
	// The public listing only ever shows open, visible jobs (AC-09.1).
	const conditions: SQL[] = [eq(jobs.status, 'HIRING'), eq(jobs.isHidden, false)];

	// Word match over title + description, one document per job row. The
	// expression matches `jobs_fts_idx`, the GIN full-text index. 'simple' only
	// lowercases and splits: it has no Vietnamese stemmer and no diacritic
	// folding. The query is a bound parameter, and `websearch_to_tsquery` adds
	// AND, OR and phrase semantics without making the value part of the SQL.
	if (filters.query !== undefined) {
		conditions.push(keywordSearchCondition(filters.query));
	}

	// Category and location are exact ids, resolved from the lists the API
	// serves. A substring or a display name would reintroduce duplicates.
	if (filters.categoryId !== undefined) {
		conditions.push(eq(jobs.categoryId, filters.categoryId));
	}

	if (filters.locationId !== undefined) {
		conditions.push(eq(jobs.locationId, filters.locationId));
	}

	// Inclusive VND bounds. The API rejects a minimum above the maximum.
	if (filters.salaryMin !== undefined) {
		conditions.push(gte(jobs.salaryAmount, filters.salaryMin));
	}

	if (filters.salaryMax !== undefined) {
		conditions.push(lte(jobs.salaryAmount, filters.salaryMax));
	}

	// Inclusive ISO-date bounds: the job starts on or after `startFrom` and
	// ends on or before `endTo`.
	if (filters.startFrom !== undefined) {
		conditions.push(gte(jobs.startDate, filters.startFrom));
	}

	if (filters.endTo !== undefined) {
		conditions.push(lte(jobs.endDate, filters.endTo));
	}

	// `&&` is array overlap: a job matches when it runs on any selected day.
	// This is OR across the selection, not an all-days match.
	if (filters.daysOfWeek !== undefined && filters.daysOfWeek.length > 0) {
		conditions.push(arrayOverlaps(jobs.daysOfWeek, filters.daysOfWeek));
	}

	// OR across blocks; each block is an overlap test, so a 17:00-20:00 shift
	// matches both Afternoon and Evening.
	if (filters.timeOfDay !== undefined && filters.timeOfDay.length > 0) {
		const timeOfDay = or(...filters.timeOfDay.map(timeOfDayCondition));

		if (timeOfDay !== undefined) {
			conditions.push(timeOfDay);
		}
	}

	// Requires the employerProfiles join. Jobs without a profile stay out of
	// this filter, which is the intended meaning of "verified only".
	if (filters.verifiedOnly) {
		conditions.push(eq(employerProfiles.verificationStatus, 'VERIFIED'));
	}

	// Featured is a public shop window, so a listing the scam scan flagged is
	// not promoted. The normal search still shows it with its warning badge.
	if (filters.sort === 'featured') {
		conditions.push(eq(jobs.needsReview, false));
	}

	return conditions;
}

/**
 * Full-text match over a job's title and description.
 *
 * Why this is raw SQL: PostgreSQL's `websearch_to_tsquery` provides AND/OR and
 * phrase semantics, and the `simple` configuration is the one the GIN index
 * uses. Drizzle has no typed equivalent for this expression.
 *
 * @param query - Raw user text from the search box.
 * @returns A boolean SQL expression for matching `jobs` rows.
 */
function keywordSearchCondition(query: string): SQL {
	return sql`
		to_tsvector('simple', ${jobs.title} || ' ' || ${jobs.description})
		@@ websearch_to_tsquery('simple', ${query})
	`;
}

/**
 * Matches a shift that overlaps one half-open time-of-day block.
 *
 * The block is `[from, to)`: a shift starting before the block ends and ending
 * after it starts counts as an overlap. A shift ending exactly at 18:00 does
 * not match Evening, which starts at 18:00.
 *
 * @param slot - The time-of-day block to compare against.
 * @returns A boolean SQL expression for an overlapping shift.
 */
function timeOfDayCondition(slot: TimeOfDay): SQL {
	const range = TIME_OF_DAY_RANGES[slot];

	return sql`${jobs.startTime} < ${range.to}::time and ${jobs.endTime} > ${range.from}::time`;
}

/**
 * Counts a job's non-withdrawn applications from the last seven days.
 *
 * Why this is a correlated subquery: it keeps the job projection flat and uses
 * the applications index for one short lookup per row. A join and GROUP BY
 * would need every job column in the grouping.
 *
 * @returns A scalar count expression for the current `jobs` row.
 */
function recentApplicationCountExpression(): SQL<number> {
	return sql<number>`(
		select count(*)::int
		from ${applications}
		where ${applications.jobId} = ${jobs.id}
			and ${applications.createdAt} >= now() - interval '7 days'
			and ${applications.status} <> 'WITHDRAWN'
	)`;
}

/**
 * Sort key that puts verified employers first in the featured list.
 *
 * Why this is a CASE: the enum's natural order is not “verified first”, and a
 * boolean sort key is explicit and stable.
 *
 * @returns A sortable SQL expression: 1 for verified, 0 otherwise.
 */
function verifiedEmployerFirstExpression(): SQL {
	return sql`case when ${employerProfiles.verificationStatus} = 'VERIFIED' then 1 else 0 end`;
}

/**
 * Returns the `ORDER BY` terms for the public job search.
 *
 * Featured is computed at query time: recent student interest first, then
 * verified employers, then recency. Every order ends with the job id so paging
 * stays stable when two rows share a timestamp or salary.
 *
 * @param sort - The requested public sort order.
 * @returns The Drizzle order terms passed to `.orderBy(...)`.
 */
function orderByForSearch(sort: JobSortOrder): SQL[] {
	if (sort === 'featured') {
		return [
			desc(recentApplicationCountExpression()),
			desc(verifiedEmployerFirstExpression()),
			desc(jobs.createdAt),
			desc(jobs.id)
		];
	}

	if (sort === 'salary_desc') {
		return [desc(jobs.salaryAmount), desc(jobs.id)];
	}

	return [desc(jobs.createdAt), desc(jobs.id)];
}
