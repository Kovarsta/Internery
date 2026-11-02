/**
 * Employer decisions on applications: rejecting and accepting.
 *
 * Each decision locks the application and then the job, so the status and
 * capacity checks run against the committed state.
 */
import { and, count, eq } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import type { Database } from '#lib/server/db/types.ts';
import { applications, jobs, notifications } from '#lib/server/db/product.schema.ts';
import { findApplicationById } from './reads.ts';
import type { ApplicationListRecord, NotificationInsert } from './selections.ts';

/**
 * Rejects a pending application.
 *
 * Only the employer who owns the job may decide, and only while the application
 * is `PENDING` (AC-24.5). The reason, when given, is stored on the application
 * and sent with the notification to the student.
 */
export async function rejectApplication(
	database: Database,
	employerId: string,
	applicationId: string,
	reason: string | null
): Promise<ApplicationListRecord> {
	await database.transaction(async (tx) => {
		const [application] = await tx
			.select({
				id: applications.id,
				jobId: applications.jobId,
				studentId: applications.studentId,
				status: applications.status
			})
			.from(applications)
			.where(eq(applications.id, applicationId))
			.for('update');

		if (!application) {
			throw new DomainError('NOT_FOUND');
		}

		const [job] = await tx
			.select({ id: jobs.id, title: jobs.title, employerId: jobs.employerId })
			.from(jobs)
			.where(eq(jobs.id, application.jobId))
			.limit(1);

		if (!job) {
			throw new DomainError('NOT_FOUND');
		}

		// Ownership is checked before the status so a non-owner learns nothing
		// about an application they cannot decide.
		if (job.employerId !== employerId) {
			throw new DomainError('FORBIDDEN');
		}

		if (application.status !== 'PENDING') {
			throw new DomainError('INVALID_STATE_TRANSITION');
		}

		await tx
			.update(applications)
			.set({ status: 'REJECTED', rejectReason: reason, decidedAt: new Date() })
			.where(eq(applications.id, applicationId));

		await tx.insert(notifications).values({
			userId: application.studentId,
			type: 'APPLICATION_REJECTED',
			title: `Your application for "${job.title}" was not accepted`,
			body: reason,
			jobId: job.id,
			applicationId
		});
	});

	const application = await findApplicationById(database, applicationId);

	if (!application) {
		throw new Error('The rejected application could not be read back.');
	}

	return application;
}

export type AcceptedApplication = {
	application: ApplicationListRecord;
	jobFilled: boolean;
};

/**
 * Accepts a pending application.
 *
 * The job row is locked before the capacity check, so two accepts for the last
 * position cannot both succeed. Accepting the last needed student moves the job
 * to `FILLED` and tells the remaining pending applicants (AC-24.3, AC-24.4).
 *
 * Lock order is application then job, the same order every write path uses.
 */
export async function acceptApplication(
	database: Database,
	employerId: string,
	applicationId: string
): Promise<AcceptedApplication> {
	let jobFilled = false;

	await database.transaction(async (tx) => {
		const [application] = await tx
			.select({
				id: applications.id,
				jobId: applications.jobId,
				studentId: applications.studentId,
				status: applications.status
			})
			.from(applications)
			.where(eq(applications.id, applicationId))
			.for('update');

		if (!application) {
			throw new DomainError('NOT_FOUND');
		}

		const [job] = await tx
			.select({
				id: jobs.id,
				title: jobs.title,
				employerId: jobs.employerId,
				status: jobs.status,
				positionsNeeded: jobs.positionsNeeded
			})
			.from(jobs)
			.where(eq(jobs.id, application.jobId))
			.for('update');

		if (!job) {
			throw new DomainError('NOT_FOUND');
		}

		// Ownership first, so a non-owner learns nothing about the application.
		if (job.employerId !== employerId) {
			throw new DomainError('FORBIDDEN');
		}

		if (application.status !== 'PENDING') {
			throw new DomainError('INVALID_STATE_TRANSITION');
		}

		if (job.status !== 'HIRING') {
			throw new DomainError('JOB_NOT_HIRING');
		}

		const [counts] = await tx
			.select({ accepted: count() })
			.from(applications)
			.where(and(eq(applications.jobId, job.id), eq(applications.status, 'ACCEPTED')));

		const accepted = counts?.accepted ?? 0;

		if (accepted >= job.positionsNeeded) {
			throw new DomainError('POSITIONS_FULL');
		}

		await tx
			.update(applications)
			.set({ status: 'ACCEPTED', decidedAt: new Date() })
			.where(eq(applications.id, application.id));

		jobFilled = accepted + 1 >= job.positionsNeeded;

		if (jobFilled) {
			await tx.update(jobs).set({ status: 'FILLED' }).where(eq(jobs.id, job.id));

			const stillPending = await tx
				.select({ userId: applications.studentId })
				.from(applications)
				.where(and(eq(applications.jobId, job.id), eq(applications.status, 'PENDING')));

			if (stillPending.length > 0) {
				const pendingNotifications: NotificationInsert[] = stillPending.map(({ userId }) => ({
					userId,
					type: 'JOB_FILLED',
					title: `"${job.title}" has found all the people it needs`,
					jobId: job.id
				}));

				await tx.insert(notifications).values(pendingNotifications);
			}
		}

		await tx.insert(notifications).values({
			userId: application.studentId,
			type: 'APPLICATION_ACCEPTED',
			title: `Your application for "${job.title}" was accepted`,
			jobId: job.id,
			applicationId: application.id
		});
	});

	const application = await findApplicationById(database, applicationId);

	if (!application) {
		throw new Error('The accepted application could not be read back.');
	}

	return { application, jobFilled };
}
