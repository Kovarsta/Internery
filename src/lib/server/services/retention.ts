import { and, count, eq, inArray, isNotNull, lt, or } from 'drizzle-orm';
import type { Database } from '#lib/server/db/types.ts';
import { sessions, verifications } from '#lib/server/db/auth.schema.ts';
import {
	aiExplanations,
	aiUsage,
	applications,
	auditLogs,
	jobs,
	notifications
} from '#lib/server/db/product.schema.ts';

/** Sessions are kept this long after they expire, then deleted. */
const SESSION_GRACE_DAYS = 30;

/** Verification tokens are kept this long after they expire. */
const VERIFICATION_GRACE_DAYS = 7;

const NOTIFICATION_RETENTION_DAYS = 90;
const AI_EXPLANATION_RETENTION_DAYS = 30;
const AI_USAGE_RETENTION_DAYS = 90;
const AUDIT_RETENTION_MONTHS = 24;

/** A rejected or withdrawn application keeps its CV for six months. */
const REJECTED_CV_MONTHS = 6;

/** An accepted application keeps its CV for 24 months after the job ends. */
const ACCEPTED_CV_MONTHS = 24;

const DAY_MS = 24 * 60 * 60 * 1000;

export type RetentionOptions = {
	now?: Date;
	dryRun?: boolean;
};

/**
 * Number of days in the month that `date` falls in.
 *
 * `new Date(year, month + 1, 0)` asks for day 0 of the next month. JavaScript
 * resolves that to the last day of the current month, so February 2026 gives
 * 28 and February 2024 gives 29.
 */
function daysInMonth(date: Date): number {
	return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Moves a date back by whole months, clamped to the target month's last day.
 *
 * 31 March minus one month is 28 February, not 3 March: the policy is measured
 * in months, so the day has to give way when the target month is shorter.
 */
function monthsAgo(from: Date, months: number): Date {
	// Work on a copy; callers reuse the same `now` for several cutoffs.
	const target = new Date(from);

	// Remember the original day so it can be restored when the target month has it.
	const day = from.getDate();

	// Park on the 1st before changing the month. Setting the month while on day
	// 31 makes JavaScript roll an invalid date forward (31 February -> 3 March).
	target.setDate(1);
	target.setMonth(target.getMonth() - months);

	// Clamp to the target month: 31 becomes 28 in February and 30 in April.
	target.setDate(Math.min(day, daysInMonth(target)));

	return target;
}

/** Returns a copy of `from` moved back by whole days. */
function daysAgo(from: Date, days: number): Date {
	return new Date(from.getTime() - days * DAY_MS);
}

/**
 * Clears the CV columns of applications whose retention period has passed.
 *
 * Rejected and withdrawn applications expire six months after the decision.
 * Accepted applications expire 24 months after the job reached a terminal
 * state. The object itself is left for the storage sweep, which deletes it once
 * nothing references it.
 */
export async function expireApplicationCv(
	database: Database,
	options: RetentionOptions = {}
): Promise<number> {
	const now = options.now ?? new Date();
	const rejectedCutoff = monthsAgo(now, REJECTED_CV_MONTHS);
	const acceptedCutoff = monthsAgo(now, ACCEPTED_CV_MONTHS);

	// Two independent rules. A decided application expires six months after the
	// decision. An accepted application expires 24 months after the job reached a
	// terminal state. Rows with a null date never match, which keeps pending
	// applications and non-terminal jobs out of the update.
	const expired = or(
		and(
			or(eq(applications.status, 'REJECTED'), eq(applications.status, 'WITHDRAWN')),
			lt(applications.decidedAt, rejectedCutoff)
		),
		and(
			eq(applications.status, 'ACCEPTED'),
			or(lt(jobs.completedAt, acceptedCutoff), lt(jobs.cancelledAt, acceptedCutoff))
		)
	);

	const expiredApplications = await database
		.select({ id: applications.id })
		.from(applications)
		.innerJoin(jobs, eq(jobs.id, applications.jobId))
		.where(and(isNotNull(applications.cvKey), expired));

	if (options.dryRun ?? true) {
		return expiredApplications.length;
	}

	if (expiredApplications.length === 0) {
		return 0;
	}

	await database
		.update(applications)
		.set({ cvKey: null, cvFileName: null })
		.where(
			inArray(
				applications.id,
				expiredApplications.map((application) => application.id)
			)
		);

	return expiredApplications.length;
}

/** Deletes sessions that expired more than 30 days ago. */
export async function purgeExpiredSessions(
	database: Database,
	options: RetentionOptions = {}
): Promise<number> {
	const cutoff = daysAgo(options.now ?? new Date(), SESSION_GRACE_DAYS);
	const condition = lt(sessions.expiresAt, cutoff);

	if (options.dryRun ?? true) {
		const [row] = await database.select({ total: count() }).from(sessions).where(condition);

		return row?.total ?? 0;
	}

	const deleted = await database.delete(sessions).where(condition).returning({ id: sessions.id });

	return deleted.length;
}

/** Deletes verification tokens that expired more than seven days ago. */
export async function purgeExpiredVerifications(
	database: Database,
	options: RetentionOptions = {}
): Promise<number> {
	const cutoff = daysAgo(options.now ?? new Date(), VERIFICATION_GRACE_DAYS);
	const condition = lt(verifications.expiresAt, cutoff);

	if (options.dryRun ?? true) {
		const [row] = await database.select({ total: count() }).from(verifications).where(condition);

		return row?.total ?? 0;
	}

	const deleted = await database
		.delete(verifications)
		.where(condition)
		.returning({ id: verifications.id });

	return deleted.length;
}

/** Deletes notifications older than 90 days. */
export async function purgeOldNotifications(
	database: Database,
	options: RetentionOptions = {}
): Promise<number> {
	const cutoff = daysAgo(options.now ?? new Date(), NOTIFICATION_RETENTION_DAYS);
	const condition = lt(notifications.createdAt, cutoff);

	if (options.dryRun ?? true) {
		const [row] = await database.select({ total: count() }).from(notifications).where(condition);

		return row?.total ?? 0;
	}

	const deleted = await database
		.delete(notifications)
		.where(condition)
		.returning({ id: notifications.id });

	return deleted.length;
}

/** Deletes cached AI explanations older than 30 days. */
export async function purgeOldAiExplanations(
	database: Database,
	options: RetentionOptions = {}
): Promise<number> {
	const cutoff = daysAgo(options.now ?? new Date(), AI_EXPLANATION_RETENTION_DAYS);
	const condition = lt(aiExplanations.createdAt, cutoff);

	if (options.dryRun ?? true) {
		const [row] = await database.select({ total: count() }).from(aiExplanations).where(condition);

		return row?.total ?? 0;
	}

	const deleted = await database
		.delete(aiExplanations)
		.where(condition)
		.returning({ id: aiExplanations.id });

	return deleted.length;
}

/** Deletes AI usage day rows older than 90 days. */
export async function purgeOldAiUsage(
	database: Database,
	options: RetentionOptions = {}
): Promise<number> {
	const cutoff = daysAgo(options.now ?? new Date(), AI_USAGE_RETENTION_DAYS)
		.toISOString()
		.slice(0, 10);
	const condition = lt(aiUsage.day, cutoff);

	if (options.dryRun ?? true) {
		const [row] = await database.select({ total: count() }).from(aiUsage).where(condition);

		return row?.total ?? 0;
	}

	const deleted = await database
		.delete(aiUsage)
		.where(condition)
		.returning({ userId: aiUsage.userId, day: aiUsage.day });

	return deleted.length;
}

/** Deletes audit entries older than 24 months. */
export async function purgeOldAuditLogs(
	database: Database,
	options: RetentionOptions = {}
): Promise<number> {
	const cutoff = monthsAgo(options.now ?? new Date(), AUDIT_RETENTION_MONTHS);
	const condition = lt(auditLogs.createdAt, cutoff);

	if (options.dryRun ?? true) {
		const [row] = await database.select({ total: count() }).from(auditLogs).where(condition);

		return row?.total ?? 0;
	}

	const deleted = await database.delete(auditLogs).where(condition).returning({ id: auditLogs.id });

	return deleted.length;
}
