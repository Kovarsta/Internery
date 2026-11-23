/**
 * Weekly availability digest.
 *
 * Finds students with saved free time and returns the jobs posted since their
 * last email that fit it. The schedule rule is the same containment test the
 * `/recommendations` page uses: every day the job runs must be a free day, and
 * the whole shift must sit inside one free block.
 *
 * The caller sends one email per student and records the send time, so the next
 * run only reports newer jobs.
 */
import { and, arrayContained, desc, eq, gt, or, sql, type SQL } from 'drizzle-orm';
import type { DayOfWeek, TimeOfDay } from '#lib/schedule.ts';
import { TIME_OF_DAY_RANGES } from '#lib/schedule.ts';
import type { Database } from '#lib/server/db/types.ts';
import { users } from '#lib/server/db/auth.schema.ts';
import { employerProfiles, jobs, studentProfiles } from '#lib/server/db/product.schema.ts';

/** A student due a digest, with the availability to match against. */
export type DigestCandidate = {
	studentId: string;
	email: string;
	fullName: string;
	days: DayOfWeek[];
	timeOfDay: TimeOfDay[];
	lastSentAt: Date | null;
};

/** One job in the email. */
export type DigestJob = {
	id: string;
	title: string;
	employerName: string;
};

/** Days between digests. */
export const DIGEST_INTERVAL_DAYS = 7;

/** Most jobs named in one email. */
export const DIGEST_JOB_LIMIT = 5;

/**
 * Lists students who are due a digest.
 *
 * A student qualifies when they are an active student, kept the email on, saved
 * at least one day or block, and were not emailed in the last
 * `DIGEST_INTERVAL_DAYS` days.
 */
export async function listDigestCandidates(database: Database): Promise<DigestCandidate[]> {
	const rows = await database
		.select({
			studentId: studentProfiles.userId,
			email: users.email,
			fullName: users.name,
			days: studentProfiles.availableDays,
			timeOfDay: studentProfiles.availableTimeOfDay,
			lastSentAt: studentProfiles.digestLastSentAt
		})
		.from(studentProfiles)
		.innerJoin(users, eq(users.id, studentProfiles.userId))
		.where(
			and(
				eq(users.role, 'STUDENT'),
				eq(users.status, 'ACTIVE'),
				eq(studentProfiles.digestEnabled, true),
				sql`(cardinality(${studentProfiles.availableDays}) > 0
					or cardinality(${studentProfiles.availableTimeOfDay}) > 0)`,
				sql`(${studentProfiles.digestLastSentAt} is null
					or ${studentProfiles.digestLastSentAt} < now() - interval '${sql.raw(String(DIGEST_INTERVAL_DAYS))} days')`
			)
		);

	return rows;
}

/**
 * Finds hiring jobs posted since `since` that fit the availability.
 *
 * Empty availability means “no preference” and adds no condition.
 */
export async function findDigestJobs(
	database: Database,
	days: readonly DayOfWeek[],
	timeOfDay: readonly TimeOfDay[],
	since: Date
): Promise<DigestJob[]> {
	const conditions: SQL[] = [
		eq(jobs.status, 'HIRING'),
		eq(jobs.isHidden, false),
		gt(jobs.createdAt, since)
	];

	if (days.length > 0) {
		conditions.push(arrayContained(jobs.daysOfWeek, [...days]));
	}

	if (timeOfDay.length > 0) {
		const blocks = timeOfDay.map((slot) => {
			const range = TIME_OF_DAY_RANGES[slot];

			return sql`(${jobs.startTime} >= ${range.from}::time and ${jobs.endTime} <= ${range.to}::time)`;
		});

		const insideOneBlock = or(...blocks);

		if (insideOneBlock !== undefined) {
			conditions.push(insideOneBlock);
		}
	}

	return database
		.select({
			id: jobs.id,
			title: jobs.title,
			employerName: sql<string>`coalesce(${employerProfiles.orgName}, 'An employer')`
		})
		.from(jobs)
		.leftJoin(employerProfiles, eq(employerProfiles.userId, jobs.employerId))
		.where(and(...conditions))
		.orderBy(desc(jobs.createdAt))
		.limit(DIGEST_JOB_LIMIT);
}

/** Records that a digest was sent, so the next run only reports newer jobs. */
export async function markDigestSent(
	database: Database,
	studentId: string,
	sentAt: Date
): Promise<void> {
	await database
		.update(studentProfiles)
		.set({ digestLastSentAt: sentAt })
		.where(eq(studentProfiles.userId, studentId));
}

/** The date a digest should report from, given when the last one went out. */
export function digestSince(lastSentAt: Date | null, now: Date): Date {
	if (lastSentAt !== null) {
		return lastSentAt;
	}

	return new Date(now.getTime() - DIGEST_INTERVAL_DAYS * 24 * 60 * 60 * 1000);
}
