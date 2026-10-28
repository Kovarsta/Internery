import { and, eq } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import type { Database } from '#lib/server/db/types.ts';
import { jobs, savedJobs } from '#lib/server/db/product.schema.ts';

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
