import { and, count, eq, sql } from 'drizzle-orm';
import type { Transaction } from '#lib/server/db/types.ts';
import { employerProfiles, reviews, studentProfiles } from '#lib/server/db/product.schema.ts';

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
	// The `float8` cast keeps the average a JSON number, and the rounding
	// matches the two decimals of the profile rating columns.
	const [rating] = await transaction
		.select({
			ratingAvg: sql<number>`coalesce(round(avg(${reviews.rating})::numeric, 2), 0)::float8`,
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
