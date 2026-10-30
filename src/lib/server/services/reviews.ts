import { and, count, desc, eq, sql } from 'drizzle-orm';
import type { Database } from '#lib/server/db/types.ts';
import { users } from '#lib/server/db/auth.schema.ts';
import { reviews } from '#lib/server/db/product.schema.ts';

export type ReviewListRecord = {
	id: string;
	jobId: string;
	reviewerId: string;
	reviewerName: string;
	rating: number;
	comment: string | null;
	createdAt: Date;
};

export type UserReviewPage = {
	items: ReviewListRecord[];
	total: number;
	ratingAvg: number;
	ratingCount: number;
};

export type UserReviewListOptions = {
	userId: string;
	limit: number;
	offset: number;
};

/**
 * Returns a user's visible reviews and their rating summary.
 *
 * Returns `null` when the user does not exist, so the route can answer `404`.
 * Hidden reviews are excluded from the page, the total and the average, which
 * matches the admin removal rule (AC-28.2).
 */
export async function listReviewsForUser(
	database: Database,
	options: UserReviewListOptions
): Promise<UserReviewPage | null> {
	const visibleReviews = and(eq(reviews.revieweeId, options.userId), eq(reviews.isHidden, false));

	const [userRows, items, totalRows, ratingRows] = await Promise.all([
		database.select({ id: users.id }).from(users).where(eq(users.id, options.userId)).limit(1),
		database
			.select({
				id: reviews.id,
				jobId: reviews.jobId,
				reviewerId: reviews.reviewerId,
				reviewerName: users.name,
				rating: reviews.rating,
				comment: reviews.comment,
				createdAt: reviews.createdAt
			})
			.from(reviews)
			.innerJoin(users, eq(users.id, reviews.reviewerId))
			.where(visibleReviews)
			.orderBy(desc(reviews.createdAt), desc(reviews.id))
			.limit(options.limit)
			.offset(options.offset),
		database.select({ total: count() }).from(reviews).where(visibleReviews),
		// `avg` returns `numeric`, which the driver hands back as a string to avoid
		// precision loss. The `float8` cast is what keeps `ratingAvg` a JSON number.
		// Rounding to two decimals matches the `numeric(3, 2)` profile columns, and
		// `coalesce` covers a user with no visible reviews, where `avg` is NULL.
		database
			.select({
				ratingAvg: sql<number>`coalesce(round(avg(${reviews.rating})::numeric, 2), 0)::float8`,
				ratingCount: count()
			})
			.from(reviews)
			.where(visibleReviews)
	]);

	// All four queries run together; the existence check only decides between a
	// page of reviews and a 404, so it does not need its own round trip.
	if (userRows.length === 0) {
		return null;
	}

	const rating = ratingRows[0];

	return {
		items,
		total: totalRows[0]?.total ?? 0,
		ratingAvg: rating?.ratingAvg ?? 0,
		ratingCount: rating?.ratingCount ?? 0
	};
}
