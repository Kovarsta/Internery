/**
 * Job writes: create, edit and delete.
 *
 * Create and edit validate the category and run the scam-term scan; a job with
 * accepted applicants cannot be deleted.
 */
import { and, eq } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import type { Database } from '#lib/server/db/types.ts';
import { applications, jobs } from '#lib/server/db/product.schema.ts';
import { findActiveCategory } from '../categories.ts';
import { findScamTerms } from '../job-moderation.ts';
import { findJobDetail } from './reads.ts';
import type { JobDetailRecord, JobRecord } from './selections.ts';

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

/** Builds a `422` with the field that failed a service-level rule. */
function validationError(field: string, message: string): DomainError {
	return new DomainError('VALIDATION_ERROR', 'Request validation failed.', [{ field, message }]);
}
