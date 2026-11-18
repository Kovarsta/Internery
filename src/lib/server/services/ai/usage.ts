/**
 * The AI call budget (NFR-25: at most 10 calls per user per day).
 *
 * A call is reserved before the provider is contacted and released again if
 * the provider fails, so a timeout or an upstream error never costs a student
 * one of their ten attempts. The reservation is one atomic upsert, which keeps
 * two simultaneous requests from both seeing "9 used".
 */
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '#lib/server/db/types.ts';
import { aiUsage } from '#lib/server/db/product.schema.ts';

/** Daily provider-call budget per user. */
export const DAILY_AI_CALL_LIMIT = 10;

/**
 * Formats a date as `YYYY-MM-DD` in Vietnam time.
 *
 * The marketplace serves Vietnamese students, so the day rolls over at local
 * midnight rather than at 07:00 local time (UTC midnight).
 */
const usageDayFormatter = new Intl.DateTimeFormat('en-CA', {
	timeZone: 'Asia/Ho_Chi_Minh',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

/** Returns the usage day for a moment in time. */
export function currentAiUsageDay(now = new Date()): string {
	return usageDayFormatter.format(now);
}

/** The day a reservation belongs to, used when releasing it. */
export type AiCallReservation = {
	day: string;
};

/**
 * Reserves one provider call for today.
 *
 * Returns null when the daily limit is already reached. The insert path is
 * unconditional because a new day starts at zero.
 *
 * The cap is enforced in the same statement as the increment, so two
 * simultaneous requests cannot both read "9 used":
 * https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT
 */
export async function reserveAiCall(
	database: Database,
	userId: string
): Promise<AiCallReservation | null> {
	const day = currentAiUsageDay();

	const rows = await database
		.insert(aiUsage)
		.values({ userId, day, count: 1 })
		.onConflictDoUpdate({
			target: [aiUsage.userId, aiUsage.day],
			set: { count: sql`${aiUsage.count} + 1` },
			setWhere: sql`${aiUsage.count} < ${DAILY_AI_CALL_LIMIT}`
		})
		.returning({ count: aiUsage.count });

	return rows.length > 0 ? { day } : null;
}

/**
 * Gives a reserved call back after the provider failed.
 *
 * `greatest(..., 0)` keeps the check constraint satisfied if a concurrent
 * request already released the same slot; a failure must never turn into a
 * second error.
 */
export async function releaseAiCall(
	database: Database,
	userId: string,
	reservation: AiCallReservation
): Promise<void> {
	await database
		.update(aiUsage)
		.set({ count: sql`greatest(${aiUsage.count} - 1, 0)` })
		.where(and(eq(aiUsage.userId, userId), eq(aiUsage.day, reservation.day)));
}
