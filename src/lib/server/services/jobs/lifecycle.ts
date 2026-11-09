/**
 * Job lifecycle transitions: cancelling and completing a job.
 *
 * Each transition locks the job row and notifies the students affected by it.
 */
import { and, eq, inArray } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import { sendNotificationEmails } from '#lib/server/email-notifications.ts';
import type { Database } from '#lib/server/db/types.ts';
import { applications, jobs, notifications } from '#lib/server/db/product.schema.ts';
import { findJobDetail } from './reads.ts';
import type {
	ApplicationRecord,
	JobDetailRecord,
	JobRecord,
	NotificationInsert
} from './selections.ts';

/** Statuses an employer may cancel from; a completed job is final (AC-19.2). */
const CANCELLABLE_STATUSES: JobRecord['status'][] = ['HIRING', 'CLOSED', 'FILLED'];

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
 * Stops accepting applications without filling the remaining positions.
 *
 * The job becomes `CLOSED`, leaves search and keeps its accepted students.
 * Pending applicants are told that it is no longer accepting applications. A
 * closed job can later be completed or cancelled.
 */
export async function closeJob(
	database: Database,
	employerId: string,
	jobId: string
): Promise<JobDetailRecord> {
	const pendingEmails: NotificationInsert[] = [];

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

		if (job.status !== 'HIRING') {
			throw new DomainError('INVALID_STATE_TRANSITION');
		}

		await tx.update(jobs).set({ status: 'CLOSED' }).where(eq(jobs.id, job.id));

		const stillPending = await tx
			.select({ userId: applications.studentId })
			.from(applications)
			.where(and(eq(applications.jobId, job.id), eq(applications.status, 'PENDING')));

		if (stillPending.length > 0) {
			const notificationsForPending: NotificationInsert[] = stillPending.map(({ userId }) => ({
				userId,
				type: 'JOB_CLOSED',
				title: `"${job.title}" is no longer accepting applications`,
				body: 'The employer closed applications before filling every position.',
				jobId: job.id
			}));

			await tx.insert(notifications).values(notificationsForPending);
			pendingEmails.push(...notificationsForPending);
		}
	});

	const job = await findJobDetail(database, jobId);

	if (!job) {
		throw new Error('The closed job could not be read back.');
	}

	await sendNotificationEmails(database, pendingEmails);

	return job;
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
	const pendingEmails: NotificationInsert[] = [];

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

		// Completing needs `FILLED` or `CLOSED`; cancelling also accepts `HIRING`.
		const isAllowed =
			to === 'COMPLETED'
				? job.status === 'FILLED' || job.status === 'CLOSED'
				: CANCELLABLE_STATUSES.includes(job.status);

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
			pendingEmails.push(...audienceNotifications);
		}
	});

	const job = await findJobDetail(database, jobId);

	if (!job) {
		throw new Error('The updated job could not be read back.');
	}

	await sendNotificationEmails(database, pendingEmails);

	return job;
}
