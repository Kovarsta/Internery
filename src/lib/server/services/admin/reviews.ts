/**
 * Admin review moderation.
 *
 * Removing a review hides it instead of deleting it: the row stays for the
 * audit trail and to keep the work record it issued valid, but it disappears
 * from the public list and no longer counts towards the rating.
 */
import { eq } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import type { Database } from '#lib/server/db/types.ts';
import { users } from '#lib/server/db/auth.schema.ts';
import { reviews } from '#lib/server/db/product.schema.ts';
import { recalculateUserRating } from '../ratings.ts';
import { recordAuditLog } from './audit.ts';

export type RemoveReviewInput = {
	adminId: string;
	reviewId: string;
	reason: string | null;
};

/**
 * Hides a review and recalculates the reviewed person's rating.
 *
 * The reviewee's user row is locked before the recalculation, the same lock
 * `createReview` takes, so a removal and a new review cannot each store an
 * average that misses the other. Removing an already hidden review succeeds and
 * only recalculates again, which keeps a retried request harmless.
 */
export async function removeReview(database: Database, input: RemoveReviewInput): Promise<void> {
	await database.transaction(async (tx) => {
		const [review] = await tx
			.select({ id: reviews.id, revieweeId: reviews.revieweeId, isHidden: reviews.isHidden })
			.from(reviews)
			.where(eq(reviews.id, input.reviewId))
			.for('update');

		if (!review) {
			throw new DomainError('NOT_FOUND');
		}

		if (!review.isHidden) {
			await tx
				.update(reviews)
				.set({ isHidden: true, hiddenBy: input.adminId, hiddenAt: new Date() })
				.where(eq(reviews.id, review.id));
		}

		const [reviewee] = await tx
			.select({ id: users.id })
			.from(users)
			.where(eq(users.id, review.revieweeId))
			.for('update');

		if (!reviewee) {
			throw new DomainError('NOT_FOUND');
		}

		await recalculateUserRating(tx, review.revieweeId);

		await recordAuditLog(tx, {
			actorId: input.adminId,
			action: 'REVIEW_REMOVED',
			targetType: 'REVIEW',
			targetId: review.id,
			metadata: { reason: input.reason }
		});
	});
}
