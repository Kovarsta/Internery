/**
 * Application writes: submitting an application and withdrawing it.
 *
 * Applying locks the job and the student profile, so the CV snapshot is taken
 * from a stable row.
 */
import { eq } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import type { Database } from '#lib/server/db/types.ts';
import {
	applications,
	jobs,
	notifications,
	studentProfiles
} from '#lib/server/db/product.schema.ts';
import { findApplicationForStudent, findStudentApplicationForJob } from './reads.ts';
import type {
	ApplicationListRecord,
	NewApplicationInput,
	NotificationInsert
} from './selections.ts';
import { sendNotificationEmails } from '#lib/server/email-notifications.ts';

/**
 * Creates a `PENDING` application for a student.
 *
 * The CV is copied onto the application so a later replacement or deletion of
 * the profile CV cannot change what the employer received. The employer gets an
 * in-app notification; email delivery is not wired yet.
 *
 * Throws `NOT_FOUND` for an unknown or hidden job, `JOB_NOT_HIRING` when the job
 * is closed, and `ALREADY_APPLIED` when an application is pending, accepted or
 * rejected. A withdrawn application is revived in place, so withdrawing does not
 * permanently block the student from the job.
 */
export async function applyToJob(
	database: Database,
	student: { id: string; name: string },
	jobId: string,
	input: NewApplicationInput
): Promise<ApplicationListRecord> {
	const pendingEmails: NotificationInsert[] = [];

	await database.transaction(async (tx) => {
		const [job] = await tx
			.select({
				id: jobs.id,
				title: jobs.title,
				employerId: jobs.employerId,
				status: jobs.status,
				isHidden: jobs.isHidden
			})
			.from(jobs)
			.where(eq(jobs.id, jobId))
			.for('update');

		// A hidden job is invisible in search, so it is also not appliable.
		if (!job || job.isHidden) {
			throw new DomainError('NOT_FOUND');
		}

		if (job.status !== 'HIRING') {
			throw new DomainError('JOB_NOT_HIRING');
		}

		let cvKey: string | null = null;
		let cvFileName: string | null = null;

		if (input.attachCv) {
			// Lock the profile before reading the key. A concurrent CV
			// replacement takes the same lock in saveCv, so this snapshot is
			// either the old file or the new one, never a half-applied change.
			const [profile] = await tx
				.select({ cvKey: studentProfiles.cvKey, cvFileName: studentProfiles.cvFileName })
				.from(studentProfiles)
				.where(eq(studentProfiles.userId, student.id))
				.for('update');

			// Applying without a CV is allowed; the snapshot stays empty.
			if (profile?.cvKey && profile.cvFileName) {
				cvKey = profile.cvKey;
				cvFileName = profile.cvFileName;
			}
		}

		// Relying on the unique constraint instead of a pre-check keeps two
		// concurrent applies from both passing the check and racing the insert.
		//
		// A withdrawn row is revived in place: the student took themselves out and
		// the job is still open. Any other existing row is left untouched, the
		// update matches nothing, and no row is returned.
		const [created] = await tx
			.insert(applications)
			.values({
				jobId,
				studentId: student.id,
				message: input.message,
				cvKey,
				cvFileName
			})
			.onConflictDoUpdate({
				target: [applications.jobId, applications.studentId],
				set: {
					status: 'PENDING',
					message: input.message,
					cvKey,
					cvFileName,
					rejectReason: null,
					decidedAt: null,
					// The revived application is a fresh submission, so it sorts as
					// one in both the student and the employer lists.
					createdAt: new Date()
				},
				setWhere: eq(applications.status, 'WITHDRAWN')
			})
			.returning({ id: applications.id });

		if (!created) {
			throw new DomainError('ALREADY_APPLIED');
		}

		const notification: NotificationInsert = {
			userId: job.employerId,
			type: 'APPLICATION_RECEIVED',
			title: `New application for "${job.title}"`,
			body: `${student.name} applied to your job.`,
			jobId,
			applicationId: created.id
		};

		await tx.insert(notifications).values(notification);
		pendingEmails.push(notification);
	});

	const application = await findStudentApplicationForJob(database, student.id, jobId);

	if (!application) {
		throw new Error('The new application could not be read back.');
	}

	await sendNotificationEmails(database, pendingEmails);

	return application;
}

/**
 * Withdraws the student's own `PENDING` application.
 *
 * Throws `NOT_FOUND` for an unknown id, `FORBIDDEN` when another student owns it,
 * and `INVALID_STATE_TRANSITION` once the employer has decided (AC-14.2). The
 * employer gets an in-app notification.
 */
export async function withdrawApplication(
	database: Database,
	studentId: string,
	applicationId: string
): Promise<ApplicationListRecord> {
	const pendingEmails: NotificationInsert[] = [];

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

		if (application.studentId !== studentId) {
			throw new DomainError('FORBIDDEN');
		}

		if (application.status !== 'PENDING') {
			throw new DomainError('INVALID_STATE_TRANSITION');
		}

		await tx
			.update(applications)
			.set({ status: 'WITHDRAWN', decidedAt: new Date() })
			.where(eq(applications.id, applicationId));

		const [job] = await tx
			.select({ id: jobs.id, title: jobs.title, employerId: jobs.employerId })
			.from(jobs)
			.where(eq(jobs.id, application.jobId))
			.limit(1);

		if (job) {
			const notification: NotificationInsert = {
				userId: job.employerId,
				type: 'APPLICATION_WITHDRAWN',
				title: `An applicant withdrew from "${job.title}"`,
				jobId: job.id,
				applicationId
			};

			await tx.insert(notifications).values(notification);
			pendingEmails.push(notification);
		}
	});

	const application = await findApplicationForStudent(database, studentId, applicationId);

	if (!application) {
		throw new Error('The withdrawn application could not be read back.');
	}

	await sendNotificationEmails(database, pendingEmails);

	return application;
}
