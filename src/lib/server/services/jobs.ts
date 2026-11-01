import { and, count, desc, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import type { Database } from '#lib/server/db/types.ts';
import {
	applications,
	categories,
	employerProfiles,
	jobs,
	notifications
} from '#lib/server/db/product.schema.ts';
import { findActiveCategory } from './categories.ts';
import { findScamTerms } from './job-moderation.ts';

type JobRecord = typeof jobs.$inferSelect;
type ApplicationRecord = typeof applications.$inferSelect;
type EmployerProfileRecord = typeof employerProfiles.$inferSelect;
type NotificationInsert = typeof notifications.$inferInsert;

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
 * Accepted applications for the job in the current row.
 *
 * A correlated subquery keeps the projection flat; aggregating in the main query
 * would need a GROUP BY over every job column. `applications_job_status_idx`
 * covers `(jobId, status)`, so each row costs one short index lookup.
 */
function acceptedCountExpression(): SQL<number> {
	return sql<number>`(
		select count(*)::int
		from ${applications}
		where ${applications.jobId} = ${jobs.id}
			and ${applications.status} = 'ACCEPTED'
	)`;
}

/**
 * How many people applied to the job in the current row.
 *
 * Withdrawn applications are not counted, because they no longer appear in the
 * employer's applicant list.
 */
function applicantCountExpression(): SQL<number> {
	return sql<number>`(
		select count(*)::int
		from ${applications}
		where ${applications.jobId} = ${jobs.id}
			and ${applications.status} <> 'WITHDRAWN'
	)`;
}

/**
 * Columns that build the shared job summary.
 *
 * Mappers derive `positionsRemaining` from `acceptedCount`.
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
	acceptedCount: acceptedCountExpression(),
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
	applicantCount: applicantCountExpression(),
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
		throw validationError('categoryId', 'The category does not exist or is no longer active.');
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

export type JobUpdateInput = Partial<NewJobInput>;

/**
 * Updates an employer's own job while it is still `HIRING` (AC-18.2).
 *
 * Ownership is checked before the status, so a non-owner learns nothing beyond
 * "forbidden". The row is locked across the check and the write so an acceptance
 * cannot flip the job to `FILLED` in between. The scam scan runs again on the
 * effective title and description.
 */
export async function updateJob(
	database: Database,
	employerId: string,
	jobId: string,
	input: JobUpdateInput
): Promise<JobDetailRecord> {
	// The category check runs outside the transaction because the row lock is
	// only needed for the job and the scan, and a category rarely disappears.
	if (input.categoryId !== undefined) {
		const category = await findActiveCategory(database, input.categoryId);

		if (!category) {
			throw validationError('categoryId', 'The category does not exist or is no longer active.');
		}
	}

	await database.transaction(async (tx) => {
		const [job] = await tx
			.select({
				employerId: jobs.employerId,
				status: jobs.status,
				title: jobs.title,
				description: jobs.description,
				startDate: jobs.startDate,
				endDate: jobs.endDate
			})
			.from(jobs)
			.where(eq(jobs.id, jobId))
			.for('update');

		if (!job) {
			throw new DomainError('NOT_FOUND');
		}

		if (job.employerId !== employerId) {
			throw new DomainError('FORBIDDEN');
		}

		if (job.status !== 'HIRING') {
			throw new DomainError('INVALID_STATE_TRANSITION');
		}

		// A partial update can move one side of the date range past the other, so
		// the check has to use the stored value when a field is omitted.
		const startDate = input.startDate ?? job.startDate;
		const endDate = input.endDate ?? job.endDate;

		if (endDate <= startDate) {
			throw validationError('endDate', 'endDate must be after startDate.');
		}

		const title = input.title ?? job.title;
		const description = input.description ?? job.description;
		const flaggedTerms = findScamTerms(`${title} ${description}`);

		await tx
			.update(jobs)
			.set({
				...input,
				needsReview: flaggedTerms.length > 0,
				flaggedTerms
			})
			.where(eq(jobs.id, jobId));
	});

	const job = await findJobDetail(database, jobId);

	if (!job) {
		throw new Error('The updated job could not be read back.');
	}

	return job;
}

/**
 * Deletes an employer's own job.
 *
 * A job with an accepted application cannot be deleted, because those students
 * need the job history; the employer has to cancel it instead (AC-20.2). The row
 * is locked so an acceptance cannot land between the check and the delete.
 * Pending applications and saved bookmarks cascade.
 */
export async function deleteJob(
	database: Database,
	employerId: string,
	jobId: string
): Promise<void> {
	await database.transaction(async (tx) => {
		const [job] = await tx
			.select({ employerId: jobs.employerId })
			.from(jobs)
			.where(eq(jobs.id, jobId))
			.for('update');

		if (!job) {
			throw new DomainError('NOT_FOUND');
		}

		if (job.employerId !== employerId) {
			throw new DomainError('FORBIDDEN');
		}

		const [acceptedApplication] = await tx
			.select({ id: applications.id })
			.from(applications)
			.where(and(eq(applications.jobId, jobId), eq(applications.status, 'ACCEPTED')))
			.limit(1);

		if (acceptedApplication) {
			throw new DomainError('JOB_HAS_ACCEPTED_APPLICANTS');
		}

		await tx.delete(jobs).where(eq(jobs.id, jobId));
	});
}

/** Statuses an employer may cancel from; a completed job is final (AC-19.2). */
const CANCELLABLE_STATUSES: JobRecord['status'][] = ['HIRING', 'FILLED'];

/**
 * Cancels an employer's job.
 *
 * Pending and accepted students are notified. The job leaves search on its own,
 * because search only returns `HIRING` jobs.
 */
export async function cancelJob(
	database: Database,
	employerId: string,
	jobId: string
): Promise<JobDetailRecord> {
	return changeJobStatus(database, employerId, jobId, 'CANCELLED');
}

/** Marks an employer's filled job as completed, which unlocks reviews (AC-25.2). */
export async function completeJob(
	database: Database,
	employerId: string,
	jobId: string
): Promise<JobDetailRecord> {
	return changeJobStatus(database, employerId, jobId, 'COMPLETED');
}

/**
 * Applies an employer-driven status change.
 *
 * The job row is locked across the check and the write, so an acceptance cannot
 * flip the job to `FILLED` between them. Accepted students hear about a
 * completion; pending and accepted students hear about a cancellation.
 */
async function changeJobStatus(
	database: Database,
	employerId: string,
	jobId: string,
	to: 'CANCELLED' | 'COMPLETED'
): Promise<JobDetailRecord> {
	await database.transaction(async (tx) => {
		const [job] = await tx
			.select({
				id: jobs.id,
				title: jobs.title,
				employerId: jobs.employerId,
				status: jobs.status
			})
			.from(jobs)
			.where(eq(jobs.id, jobId))
			.for('update');

		if (!job) {
			throw new DomainError('NOT_FOUND');
		}

		if (job.employerId !== employerId) {
			throw new DomainError('FORBIDDEN');
		}

		// Completing needs `FILLED`; cancelling also accepts `HIRING`.
		const isAllowed =
			to === 'COMPLETED' ? job.status === 'FILLED' : CANCELLABLE_STATUSES.includes(job.status);

		if (!isAllowed) {
			throw new DomainError('INVALID_STATE_TRANSITION');
		}

		const now = new Date();

		await tx
			.update(jobs)
			.set(
				to === 'COMPLETED'
					? { status: 'COMPLETED', completedAt: now }
					: { status: 'CANCELLED', cancelledAt: now }
			)
			.where(eq(jobs.id, jobId));

		const audienceStatuses: ApplicationRecord['status'][] =
			to === 'COMPLETED' ? ['ACCEPTED'] : ['PENDING', 'ACCEPTED'];

		const audience = await tx
			.select({ userId: applications.studentId })
			.from(applications)
			.where(and(eq(applications.jobId, jobId), inArray(applications.status, audienceStatuses)));

		if (audience.length > 0) {
			const type = to === 'COMPLETED' ? 'JOB_COMPLETED' : 'JOB_CANCELLED';
			const title =
				to === 'COMPLETED' ? `"${job.title}" was marked completed` : `"${job.title}" was cancelled`;

			const audienceNotifications: NotificationInsert[] = audience.map(({ userId }) => ({
				userId,
				type,
				title,
				jobId
			}));

			await tx.insert(notifications).values(audienceNotifications);
		}
	});

	const job = await findJobDetail(database, jobId);

	if (!job) {
		throw new Error('The updated job could not be read back.');
	}

	return job;
}

/** Builds a `422` with the field that failed a service-level rule. */
function validationError(field: string, message: string): DomainError {
	return new DomainError('VALIDATION_ERROR', 'Request validation failed.', [{ field, message }]);
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
