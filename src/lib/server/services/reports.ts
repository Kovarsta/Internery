/**
 * Student reports against a job.
 *
 * A report is one row per student per job. When three distinct students have
 * open reports, the job is hidden automatically and the employer is told,
 * because reports are the fastest signal that a posting is a scam (AC-42.3).
 */
import { and, countDistinct, eq } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import type { Database } from '#lib/server/db/types.ts';
import { isUniqueViolation } from '#lib/server/db/errors.ts';
import { jobs, notifications, reports } from '#lib/server/db/product.schema.ts';
import { sendNotificationEmails } from '#lib/server/email-notifications.ts';
import type { NotificationInsert } from './notifications.ts';

/** Open reports from distinct students before a job is hidden automatically. */
export const AUTO_HIDE_THRESHOLD = 3;

export type SubmitReportInput = {
	jobId: string;
	reporterId: string;
	reason: string;
};

export type SubmitReportResult = {
	/** True when this report pushed the job over the threshold and hid it. */
	autoHidden: boolean;
};

/**
 * Stores a report and hides the job at the threshold.
 *
 * The job row is locked first, so two simultaneous reports cannot both read a
 * count below the threshold and leave the job visible. The unique constraint on
 * `(jobId, reporterId)` answers a second report from the same student with
 * `ALREADY_REPORTED`.
 */
export async function submitReport(
	database: Database,
	input: SubmitReportInput
): Promise<SubmitReportResult> {
	const pendingEmails: NotificationInsert[] = [];

	const result = await database.transaction(async (tx) => {
		const [job] = await tx
			.select({
				id: jobs.id,
				title: jobs.title,
				employerId: jobs.employerId,
				isHidden: jobs.isHidden
			})
			.from(jobs)
			.where(eq(jobs.id, input.jobId))
			.for('update');

		if (!job) {
			throw new DomainError('NOT_FOUND');
		}

		try {
			await tx.insert(reports).values({
				jobId: input.jobId,
				reporterId: input.reporterId,
				reason: input.reason
			});
		} catch (error) {
			if (isUniqueViolation(error)) {
				throw new DomainError('ALREADY_REPORTED');
			}

			throw error;
		}

		const [tally] = await tx
			.select({ reporters: countDistinct(reports.reporterId) })
			.from(reports)
			.where(and(eq(reports.jobId, input.jobId), eq(reports.status, 'OPEN')));

		const openReporters = tally?.reporters ?? 0;
		const autoHidden = openReporters >= AUTO_HIDE_THRESHOLD && !job.isHidden;

		if (!autoHidden) {
			return { autoHidden: false };
		}

		await tx
			.update(jobs)
			.set({
				isHidden: true,
				hiddenBy: null,
				hiddenAt: new Date(),
				hiddenReason: `Auto-hidden after ${openReporters} reports`
			})
			.where(eq(jobs.id, job.id));

		const notification: NotificationInsert = {
			userId: job.employerId,
			type: 'JOB_AUTO_HIDDEN',
			title: `"${job.title}" was hidden after reports and is awaiting review`,
			jobId: job.id
		};

		await tx.insert(notifications).values(notification);
		pendingEmails.push(notification);

		return { autoHidden: true };
	});

	await sendNotificationEmails(database, pendingEmails);

	return result;
}
