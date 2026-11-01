import { and, count, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import type { Database } from '#lib/server/db/types.ts';
import { applications, categories, employerProfiles, jobs } from '#lib/server/db/product.schema.ts';
import { findActiveCategory } from './categories.ts';
import { findScamTerms } from './job-moderation.ts';

type JobRecord = typeof jobs.$inferSelect;
type EmployerProfileRecord = typeof employerProfiles.$inferSelect;

export type JobSummaryRecord = {
	id: string;
	title: string;
	location: string;
	salaryAmount: number;
	salaryType: JobRecord['salaryType'];
	startDate: string;
	endDate: string;
	positionsNeeded: number;
	acceptedCount: number;
	status: JobRecord['status'];
	needsReview: boolean;
	createdAt: Date;
	categoryId: string;
	categoryName: string;
	employerId: string;
	employerOrgName: string | null;
	employerOrgType: EmployerProfileRecord['orgType'] | null;
	employerVerificationStatus: EmployerProfileRecord['verificationStatus'] | null;
	employerRatingAvg: number | null;
	employerRatingCount: number | null;
};

/**
 * Columns that build the shared job summary.
 *
 * `acceptedCount` is a correlated subquery so the projection does not need a
 * GROUP BY over every job column. Mappers derive `positionsRemaining` from it.
 */
export const jobSummarySelection = {
	id: jobs.id,
	title: jobs.title,
	location: jobs.location,
	salaryAmount: jobs.salaryAmount,
	salaryType: jobs.salaryType,
	startDate: jobs.startDate,
	endDate: jobs.endDate,
	positionsNeeded: jobs.positionsNeeded,
	acceptedCount: sql<number>`(
		select count(*)::int
		from ${applications}
		where ${applications.jobId} = ${jobs.id}
			and ${applications.status} = 'ACCEPTED'
	)`,
	status: jobs.status,
	needsReview: jobs.needsReview,
	createdAt: jobs.createdAt,
	categoryId: categories.id,
	categoryName: categories.name,
	employerId: jobs.employerId,
	employerOrgName: employerProfiles.orgName,
	employerOrgType: employerProfiles.orgType,
	employerVerificationStatus: employerProfiles.verificationStatus,
	employerRatingAvg: employerProfiles.ratingAvg,
	employerRatingCount: employerProfiles.ratingCount
};

/**
 * The summary plus the fields only the owning employer sees.
 *
 * `applicantCount` ignores withdrawn applications, because the employer's
 * applicant list excludes them.
 */
export const myJobSelection = {
	...jobSummarySelection,
	applicantCount: sql<number>`(
		select count(*)::int
		from ${applications}
		where ${applications.jobId} = ${jobs.id}
			and ${applications.status} <> 'WITHDRAWN'
	)`,
	isHidden: jobs.isHidden,
	hiddenReason: jobs.hiddenReason
};

/** The summary plus the long-form fields returned by the job detail endpoint. */
export const jobDetailSelection = {
	...jobSummarySelection,
	description: jobs.description,
	schedule: jobs.schedule,
	isHidden: jobs.isHidden
};

export type MyJobRecord = JobSummaryRecord & {
	applicantCount: number;
	isHidden: boolean;
	hiddenReason: string | null;
};

export type JobDetailRecord = JobSummaryRecord & {
	description: string;
	schedule: string;
	isHidden: boolean;
};

export type MyJobListOptions = {
	employerId: string;
	status?: JobRecord['status'];
	limit: number;
	offset: number;
};

export type MyJobPage = {
	items: MyJobRecord[];
	total: number;
};

export type JobSortOrder = 'newest' | 'salary_desc';

export type JobSearchFilters = {
	query?: string;
	categoryId?: string;
	location?: string;
	salaryMin?: number;
	salaryMax?: number;
	startFrom?: string;
	endTo?: string;
	verifiedOnly: boolean;
	sort: JobSortOrder;
	limit: number;
	offset: number;
};

export type JobPage = {
	items: JobSummaryRecord[];
	total: number;
};

/** Returns one page of an employer's own jobs, newest first. */
export async function listEmployerJobs(
	database: Database,
	options: MyJobListOptions
): Promise<MyJobPage> {
	const filters = and(
		eq(jobs.employerId, options.employerId),
		options.status === undefined ? undefined : eq(jobs.status, options.status)
	);

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

export type NewJobInput = {
	title: string;
	categoryId: string;
	description: string;
	location: string;
	schedule: string;
	salaryAmount: number;
	salaryType: JobRecord['salaryType'];
	startDate: string;
	endDate: string;
	positionsNeeded: number;
};

/**
 * Creates a job in `HIRING` state and returns it as the detail projection.
 *
 * The scam scan only flags the job for the admin queue; it never blocks posting
 * (AC-43.1). An unknown or inactive category throws `VALIDATION_ERROR` with the
 * field, because the foreign key alone would surface as an internal error.
 */
export async function createJob(
	database: Database,
	employerId: string,
	input: NewJobInput
): Promise<JobDetailRecord> {
	const category = await findActiveCategory(database, input.categoryId);

	if (!category) {
		throw new DomainError('VALIDATION_ERROR', 'Request validation failed.', [
			{
				field: 'categoryId',
				message: 'The category does not exist or is no longer active.'
			}
		]);
	}

	const flaggedTerms = findScamTerms(`${input.title} ${input.description}`);

	const [inserted] = await database
		.insert(jobs)
		.values({
			employerId,
			title: input.title,
			categoryId: input.categoryId,
			description: input.description,
			location: input.location,
			schedule: input.schedule,
			salaryAmount: input.salaryAmount,
			salaryType: input.salaryType,
			startDate: input.startDate,
			endDate: input.endDate,
			positionsNeeded: input.positionsNeeded,
			// A flag, not a block: the job stays visible until an admin decides.
			needsReview: flaggedTerms.length > 0,
			flaggedTerms
		})
		.returning({ id: jobs.id });

	if (!inserted) {
		throw new Error('The job insert did not return a row.');
	}

	const job = await findJobDetail(database, inserted.id);

	if (!job) {
		throw new Error('The inserted job could not be read back.');
	}

	return job;
}

function buildSearchConditions(filters: JobSearchFilters): (SQL | undefined)[] {
	// `and()` ignores `undefined`, so every optional filter can stay on one line
	// instead of growing a chain of `if` statements.
	return [
		eq(jobs.status, 'HIRING'),
		eq(jobs.isHidden, false),
		// Matches `jobs_fts_idx`. The 'simple' configuration has no Vietnamese
		// stemmer, and `websearch_to_tsquery` tolerates quoted phrases and OR.
		filters.query === undefined
			? undefined
			: sql`to_tsvector('simple', ${jobs.title} || ' ' || ${jobs.description}) @@ websearch_to_tsquery('simple', ${filters.query})`,
		filters.categoryId === undefined ? undefined : eq(jobs.categoryId, filters.categoryId),
		filters.location === undefined
			? undefined
			: sql`${jobs.location} ilike ${toLikePattern(filters.location)} escape '\\'`,
		filters.salaryMin === undefined ? undefined : gte(jobs.salaryAmount, filters.salaryMin),
		filters.salaryMax === undefined ? undefined : lte(jobs.salaryAmount, filters.salaryMax),
		filters.startFrom === undefined ? undefined : gte(jobs.startDate, filters.startFrom),
		filters.endTo === undefined ? undefined : lte(jobs.endDate, filters.endTo),
		filters.verifiedOnly ? eq(employerProfiles.verificationStatus, 'VERIFIED') : undefined
	];
}

function orderFor(sort: JobSortOrder): SQL[] {
	// The id tie-breaker keeps paging stable when two jobs share a timestamp or
	// salary; without it, a row can repeat or vanish between pages.
	if (sort === 'salary_desc') {
		return [desc(jobs.salaryAmount), desc(jobs.id)];
	}

	return [desc(jobs.createdAt), desc(jobs.id)];
}

/**
 * Escapes LIKE wildcards so the location filter matches the text literally.
 *
 * Without this, a student typing `%` would match every job, and `_` would match
 * any single character.
 */
function toLikePattern(value: string): string {
	const escaped = value.replace(/[\\%_]/g, (character) => `\\${character}`);

	return `%${escaped}%`;
}
