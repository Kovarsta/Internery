import { and, count, desc, eq } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import type { Database } from '#lib/server/db/types.ts';
import {
	categories,
	employerProfiles,
	jobs,
	locations,
	savedJobs
} from '#lib/server/db/product.schema.ts';
import { jobSummarySelection, type JobSummaryRecord } from './jobs.ts';

export type SavedJobListOptions = {
	limit: number;
	offset: number;
};

export type SavedJobPage = {
	items: JobSummaryRecord[];
	total: number;
};

/**
 * Saves a job for a student.
 *
 * Idempotent. Throws `NOT_FOUND` when the job does not exist.
 */
export async function saveJob(database: Database, userId: string, jobId: string): Promise<void> {
	const [job] = await database
		.select({ id: jobs.id })
		.from(jobs)
		.where(eq(jobs.id, jobId))
		.limit(1);

	if (!job) {
		throw new DomainError('NOT_FOUND');
	}

	await database.insert(savedJobs).values({ userId, jobId }).onConflictDoNothing();
}

/** Removes a saved job. Idempotent; a missing bookmark is not an error. */
export async function unsaveJob(database: Database, userId: string, jobId: string): Promise<void> {
	await database
		.delete(savedJobs)
		.where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)));
}

/** Reports whether the student has bookmarked this job. */
export async function isJobSaved(
	database: Database,
	userId: string,
	jobId: string
): Promise<boolean> {
	const [bookmark] = await database
		.select({ jobId: savedJobs.jobId })
		.from(savedJobs)
		.where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)))
		.limit(1);

	return bookmark !== undefined;
}

/**
 * Returns one page of the student's saved jobs, newest save first.
 *
 * Hidden jobs are omitted; closed jobs stay in the list with their status.
 */
export async function listSavedJobs(
	database: Database,
	userId: string,
	options: SavedJobListOptions
): Promise<SavedJobPage> {
	const filters = and(eq(savedJobs.userId, userId), eq(jobs.isHidden, false));

	const [items, totalRows] = await Promise.all([
		database
			.select(jobSummarySelection)
			.from(savedJobs)
			.innerJoin(jobs, eq(savedJobs.jobId, jobs.id))
			.innerJoin(categories, eq(categories.id, jobs.categoryId))
			.innerJoin(locations, eq(locations.id, jobs.locationId))
			.leftJoin(employerProfiles, eq(employerProfiles.userId, jobs.employerId))
			.where(filters)
			.orderBy(desc(savedJobs.createdAt), desc(jobs.id))
			.limit(options.limit)
			.offset(options.offset),
		database
			.select({ total: count() })
			.from(savedJobs)
			.innerJoin(jobs, eq(savedJobs.jobId, jobs.id))
			.where(filters)
	]);

	return {
		items,
		total: totalRows[0]?.total ?? 0
	};
}
