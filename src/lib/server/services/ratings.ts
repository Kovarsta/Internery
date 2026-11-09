import { and, count, eq, sql, type SQL } from 'drizzle-orm';
import type { Transaction } from '#lib/server/db/types.ts';
import { employerProfiles, reviews, studentProfiles } from '#lib/server/db/product.schema.ts';

/**
 * Average visible review score, rounded to two decimals.
 *
 * Why this is raw SQL: `avg` returns `numeric`, which the driver exposes as a
 * string to preserve precision. The `float8` cast keeps the API value a number;
 * `round` matches the profile columns; `coalesce` covers a person with no
 * visible reviews, where `avg` is null.
 *
 * @returns A scalar SQL expression over the reviews in the current query.
 */
export function ratingAverageExpression(): SQL<number> {
	return sql<number>`coalesce(round(avg(${reviews.rating})::numeric, 2), 0)::float8`;
}

/**
 * Recalculates a user's rating summary from their visible reviews.
 *
 * Only one of the two profile rows exists for a user; updating both keeps the
 * caller from having to know which role the reviewed person holds. Hidden
 * reviews are excluded, matching the public review list (AC-28.2).
 *
 * Call this inside the transaction that added or hid a review, after locking
 * the reviewee's user row. The lock serialises the read and the write, so two
 * reviews of the same person cannot each store an average that misses the
 * other.
 */
export async function recalculateUserRating(
	transaction: Transaction,
	userId: string
): Promise<void> {
	const [rating] = await transaction
		.select({
			ratingAvg: ratingAverageExpression(),
			ratingCount: count()
		})
		.from(reviews)
		.where(and(eq(reviews.revieweeId, userId), eq(reviews.isHidden, false)));

	const ratingPatch = {
		ratingAvg: rating?.ratingAvg ?? 0,
		ratingCount: rating?.ratingCount ?? 0
	};

	await transaction
		.update(studentProfiles)
		.set(ratingPatch)
		.where(eq(studentProfiles.userId, userId));

	await transaction
		.update(employerProfiles)
		.set(ratingPatch)
		.where(eq(employerProfiles.userId, userId));
}
