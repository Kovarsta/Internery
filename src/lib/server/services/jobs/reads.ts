/**
 * Job reads: public search, job detail and the employer's own job list.
 */
import { and, count, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import { toLikePattern } from '#lib/server/api/sql.ts';
import type { Database } from '#lib/server/db/types.ts';
import { categories, employerProfiles, jobs } from '#lib/server/db/product.schema.ts';
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
 * and description; `location` is a literal substring match.
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
			.leftJoin(employerProfiles, eq(employerProfiles.userId, jobs.employerId))
			.where(and(...conditions))
			.orderBy(...orderFor(filters.sort))
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
		.leftJoin(employerProfiles, eq(employerProfiles.userId, jobs.employerId))
		.where(eq(jobs.id, jobId))
		.limit(1);

	return job ?? null;
}

/** Builds the search conditions; every filter combines with AND. */
function buildSearchConditions(filters: JobSearchFilters): SQL[] {
	const conditions: SQL[] = [eq(jobs.status, 'HIRING'), eq(jobs.isHidden, false)];

	// Matches `jobs_fts_idx`. The 'simple' configuration has no Vietnamese
	// stemmer, and `websearch_to_tsquery` tolerates quoted phrases and OR.
	if (filters.query !== undefined) {
		conditions.push(
			sql`to_tsvector('simple', ${jobs.title} || ' ' || ${jobs.description}) @@ websearch_to_tsquery('simple', ${filters.query})`
		);
	}

	if (filters.categoryId !== undefined) {
		conditions.push(eq(jobs.categoryId, filters.categoryId));
	}

	if (filters.location !== undefined) {
		conditions.push(sql`${jobs.location} ilike ${toLikePattern(filters.location)} escape '\\'`);
	}

	if (filters.salaryMin !== undefined) {
		conditions.push(gte(jobs.salaryAmount, filters.salaryMin));
	}

	if (filters.salaryMax !== undefined) {
		conditions.push(lte(jobs.salaryAmount, filters.salaryMax));
	}

	if (filters.startFrom !== undefined) {
		conditions.push(gte(jobs.startDate, filters.startFrom));
	}

	if (filters.endTo !== undefined) {
		conditions.push(lte(jobs.endDate, filters.endTo));
	}

	if (filters.verifiedOnly) {
		conditions.push(eq(employerProfiles.verificationStatus, 'VERIFIED'));
	}

	return conditions;
}

function orderFor(sort: JobSortOrder): SQL[] {
	// The id tie-breaker keeps paging stable when two jobs share a timestamp or
	// salary; without it, a row can repeat or vanish between pages.
	if (sort === 'salary_desc') {
		return [desc(jobs.salaryAmount), desc(jobs.id)];
	}

	return [desc(jobs.createdAt), desc(jobs.id)];
}
