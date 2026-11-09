/**
 * Platform statistics for the admin overview.
 *
 * Counts use the row's `createdAt`, so a date range answers "what was created
 * in this window". Jobs are counted by status as of now, which means a job
 * created in the window counts as completed if it has since completed.
 */
import { and, count, sql, type AnyColumn, type SQL } from 'drizzle-orm';
import type { Database } from '#lib/server/db/types.ts';
import { users } from '#lib/server/db/auth.schema.ts';
import { applications, jobs } from '#lib/server/db/product.schema.ts';

export type StatsRange = {
	from?: string;
	to?: string;
};

export type PlatformStatsRecord = {
	from: string | null;
	to: string | null;
	students: number;
	employers: number;
	admins: number;
	hiring: number;
	closed: number;
	filled: number;
	completed: number;
	cancelled: number;
	applicationsTotal: number;
	completedJobs: number;
};

/**
 * Counts users, jobs and applications, optionally limited to a date range.
 *
 * @param range - Optional inclusive ISO date bounds.
 * @returns Counts grouped by people, jobs and applications.
 */
export async function getPlatformStats(
	database: Database,
	range: StatsRange
): Promise<PlatformStatsRecord> {
	const [userCounts, jobCounts, applicationCounts] = await Promise.all([
		database
			.select({
				students: sql<number>`(count(*) filter (where ${users.role} = 'STUDENT'))::int`,
				employers: sql<number>`(count(*) filter (where ${users.role} = 'EMPLOYER'))::int`,
				admins: sql<number>`(count(*) filter (where ${users.role} = 'ADMIN'))::int`
			})
			.from(users)
			.where(createdInRange(users.createdAt, range)),
		database
			.select({
				hiring: sql<number>`(count(*) filter (where ${jobs.status} = 'HIRING'))::int`,
				closed: sql<number>`(count(*) filter (where ${jobs.status} = 'CLOSED'))::int`,
				filled: sql<number>`(count(*) filter (where ${jobs.status} = 'FILLED'))::int`,
				completed: sql<number>`(count(*) filter (where ${jobs.status} = 'COMPLETED'))::int`,
				cancelled: sql<number>`(count(*) filter (where ${jobs.status} = 'CANCELLED'))::int`
			})
			.from(jobs)
			.where(createdInRange(jobs.createdAt, range)),
		database
			.select({ total: count() })
			.from(applications)
			.where(createdInRange(applications.createdAt, range))
	]);

	return {
		from: range.from ?? null,
		to: range.to ?? null,
		students: userCounts[0]?.students ?? 0,
		employers: userCounts[0]?.employers ?? 0,
		admins: userCounts[0]?.admins ?? 0,
		hiring: jobCounts[0]?.hiring ?? 0,
		closed: jobCounts[0]?.closed ?? 0,
		filled: jobCounts[0]?.filled ?? 0,
		completed: jobCounts[0]?.completed ?? 0,
		cancelled: jobCounts[0]?.cancelled ?? 0,
		applicationsTotal: applicationCounts[0]?.total ?? 0,
		completedJobs: jobCounts[0]?.completed ?? 0
	};
}

/**
 * Matches rows whose timestamp falls inside the inclusive date range.
 *
 * `to` is a date, so the comparison runs against the start of the next day;
 * without that, everything created on the last day would fall outside the
 * range.
 *
 * @param column - The timestamp column to compare.
 * @param range - Optional inclusive ISO date bounds.
 * @returns The combined range condition, or undefined when no bounds are set.
 */
function createdInRange(column: AnyColumn, range: StatsRange): SQL | undefined {
	const conditions: SQL[] = [];

	if (range.from !== undefined) {
		conditions.push(sql`${column} >= ${range.from}::date`);
	}

	if (range.to !== undefined) {
		conditions.push(sql`${column} < (${range.to}::date + interval '1 day')`);
	}

	return and(...conditions);
}
