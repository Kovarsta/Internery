/**
 * Job moderation: the queue of jobs needing attention and the admin actions on
 * them.
 *
 * A job enters the queue when it is hidden, carries the scam-keyword flag, or
 * has at least one open student report. Restoring a job and clearing its flag
 * both resolve the open reports, because the admin has looked at them.
 */
import { and, asc, count, eq, or, sql, type SQL } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import { toLikePattern } from '#lib/server/api/sql.ts';
import { sendNotificationEmails } from '#lib/server/email-notifications.ts';
import type { Database, Transaction } from '#lib/server/db/types.ts';
import {
	categories,
	employerProfiles,
	jobs,
	locations,
	notifications,
	reports
} from '#lib/server/db/product.schema.ts';
import { findJobDetail } from '../jobs/reads.ts';
import {
	jobSummarySelection,
	type JobDetailRecord,
	type JobSummaryRecord
} from '../jobs/selections.ts';
import type { NotificationInsert } from '../notifications.ts';
import { recordAuditLog } from './audit.ts';

export type ModerationCause = 'REPORTED' | 'AUTO_HIDDEN' | 'ADMIN_HIDDEN' | 'SCAM_FLAG';

export type ModerationItemRecord = {
	job: JobSummaryRecord;
	isHidden: boolean;
	hiddenReason: string | null;
	openReportCount: number;
	flaggedTerms: string[];
	causes: ModerationCause[];
};

export type ModerationPage = {
	items: ModerationItemRecord[];
	total: number;
};

export type ModerationListOptions = {
	/** Case-insensitive substring of the job title. */
	search?: string;
	limit: number;
	offset: number;
};

export type HideJobInput = {
	adminId: string;
	jobId: string;
	reason: string;
};

export type JobActionInput = {
	adminId: string;
	jobId: string;
};

type ModerationRow = JobSummaryRecord & {
	isHidden: boolean;
	hiddenReason: string | null;
	hiddenBy: string | null;
	flaggedTerms: string[];
	openReportCount: number;
};

const moderationSelection = {
	...jobSummarySelection,
	isHidden: jobs.isHidden,
	hiddenReason: jobs.hiddenReason,
	hiddenBy: jobs.hiddenBy,
	flaggedTerms: jobs.flaggedTerms,
	openReportCount: sql<number>`(
		select count(*)::int
		from ${reports}
		where ${reports.jobId} = ${jobs.id}
			and ${reports.status} = 'OPEN'
	)`
};

/**
 * Returns one page of jobs needing attention, oldest first.
 *
 * Oldest first keeps the longest-waiting problem at the top of the admin list,
 * which matches how the verification queue is ordered.
 */
export async function listModerationQueue(
	database: Database,
	options: ModerationListOptions
): Promise<ModerationPage> {
	const filters = queueFilter(options.search);

	const [rows, totalRows] = await Promise.all([
		database
			.select(moderationSelection)
			.from(jobs)
			.innerJoin(categories, eq(categories.id, jobs.categoryId))
			.innerJoin(locations, eq(locations.id, jobs.locationId))
			.leftJoin(employerProfiles, eq(employerProfiles.userId, jobs.employerId))
			.where(filters)
			.orderBy(asc(jobs.createdAt), asc(jobs.id))
			.limit(options.limit)
			.offset(options.offset),
		database.select({ total: count() }).from(jobs).where(filters)
	]);

	return {
		items: rows.map(toModerationItem),
		total: totalRows[0]?.total ?? 0
	};
}

/**
 * Hides a job, tells the employer why, and writes the audit entry.
 *
 * Hiding an already hidden job is allowed: an admin may discover a better
 * reason, and the employer should be told the latest one.
 */
export async function hideJob(database: Database, input: HideJobInput): Promise<JobDetailRecord> {
	const pendingEmails: NotificationInsert[] = [];

	await database.transaction(async (tx) => {
		const [job] = await tx
			.select({ id: jobs.id, employerId: jobs.employerId, title: jobs.title })
			.from(jobs)
			.where(eq(jobs.id, input.jobId))
			.for('update');

		if (!job) {
			throw new DomainError('NOT_FOUND');
		}

		await tx
			.update(jobs)
			.set({
				isHidden: true,
				hiddenReason: input.reason,
				hiddenBy: input.adminId,
				hiddenAt: new Date()
			})
			.where(eq(jobs.id, job.id));

		const notification: NotificationInsert = {
			userId: job.employerId,
			type: 'JOB_HIDDEN',
			title: `Your job "${job.title}" was hidden`,
			body: input.reason,
			jobId: job.id
		};

		await tx.insert(notifications).values(notification);
		pendingEmails.push(notification);

		await recordAuditLog(tx, {
			actorId: input.adminId,
			action: 'JOB_HIDDEN',
			targetType: 'JOB',
			targetId: job.id,
			metadata: { reason: input.reason }
		});
	});

	const job = await requireJobDetail(database, input.jobId);

	await sendNotificationEmails(database, pendingEmails);

	return job;
}

/**
 * Clears the hidden state and resolves the open reports.
 *
 * The job only shows in search again when it is still `HIRING`; the listing
 * filter takes care of that, so this function does not touch the status.
 */
export async function restoreJob(
	database: Database,
	input: JobActionInput
): Promise<JobDetailRecord> {
	await database.transaction(async (tx) => {
		const [job] = await tx
			.select({ id: jobs.id })
			.from(jobs)
			.where(eq(jobs.id, input.jobId))
			.for('update');

		if (!job) {
			throw new DomainError('NOT_FOUND');
		}

		await tx
			.update(jobs)
			.set({ isHidden: false, hiddenReason: null, hiddenBy: null, hiddenAt: null })
			.where(eq(jobs.id, job.id));

		await resolveOpenReports(tx, input.adminId, job.id);

		await recordAuditLog(tx, {
			actorId: input.adminId,
			action: 'JOB_RESTORED',
			targetType: 'JOB',
			targetId: job.id
		});
	});

	return requireJobDetail(database, input.jobId);
}

/**
 * Removes the scam warning after an admin checked the job.
 *
 * The flagged terms are cleared with the flag so the stored reason matches the
 * banner state. Open reports are resolved for the same reason as a restore.
 */
export async function clearJobFlag(
	database: Database,
	input: JobActionInput
): Promise<JobDetailRecord> {
	await database.transaction(async (tx) => {
		const [job] = await tx
			.select({ id: jobs.id })
			.from(jobs)
			.where(eq(jobs.id, input.jobId))
			.for('update');

		if (!job) {
			throw new DomainError('NOT_FOUND');
		}

		await tx.update(jobs).set({ needsReview: false, flaggedTerms: [] }).where(eq(jobs.id, job.id));

		await resolveOpenReports(tx, input.adminId, job.id);

		await recordAuditLog(tx, {
			actorId: input.adminId,
			action: 'JOB_FLAG_CLEARED',
			targetType: 'JOB',
			targetId: job.id
		});
	});

	return requireJobDetail(database, input.jobId);
}

/**
 * The queue condition, shared by the page query and the total count.
 *
 * The search is a literal title substring, so `%` and `_` do not become
 * wildcards. It is applied before pagination, so the page and the total agree.
 */
function queueFilter(search?: string): SQL | undefined {
	const conditions: SQL[] = [];
	const hasOpenReport = sql`exists (
		select 1 from ${reports}
		where ${reports.jobId} = ${jobs.id}
			and ${reports.status} = 'OPEN'
	)`;
	const inQueue = or(eq(jobs.isHidden, true), eq(jobs.needsReview, true), hasOpenReport);

	if (inQueue) {
		conditions.push(inQueue);
	}

	if (search !== undefined) {
		conditions.push(sql`${jobs.title} ilike ${toLikePattern(search)} escape '\\'`);
	}

	return and(...conditions);
}

/** Explains why a job is in the queue; one job can have several reasons. */
function causesFor(row: ModerationRow): ModerationCause[] {
	const causes: ModerationCause[] = [];

	if (row.openReportCount > 0) {
		causes.push('REPORTED');
	}

	// `hiddenBy` is null when the report threshold hid the job automatically.
	if (row.isHidden && row.hiddenBy === null) {
		causes.push('AUTO_HIDDEN');
	}

	if (row.isHidden && row.hiddenBy !== null) {
		causes.push('ADMIN_HIDDEN');
	}

	if (row.needsReview) {
		causes.push('SCAM_FLAG');
	}

	return causes;
}

function toModerationItem(row: ModerationRow): ModerationItemRecord {
	return {
		job: row,
		isHidden: row.isHidden,
		hiddenReason: row.hiddenReason,
		openReportCount: row.openReportCount,
		flaggedTerms: row.flaggedTerms,
		causes: causesFor(row)
	};
}

async function resolveOpenReports(
	transaction: Transaction,
	adminId: string,
	jobId: string
): Promise<void> {
	await transaction
		.update(reports)
		.set({ status: 'RESOLVED', resolvedBy: adminId, resolvedAt: new Date() })
		.where(and(eq(reports.jobId, jobId), eq(reports.status, 'OPEN')));
}

async function requireJobDetail(database: Database, jobId: string): Promise<JobDetailRecord> {
	const job = await findJobDetail(database, jobId);

	if (!job) {
		throw new Error('The moderated job could not be read back.');
	}

	return job;
}
