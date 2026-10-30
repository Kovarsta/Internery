import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireActiveAccount } from '#lib/server/api/auth.ts';
import { ApiError, handleApiError } from '#lib/server/api/errors.ts';
import { toReview } from '#lib/server/api/mappers.ts';
import { paged, parsePagination } from '#lib/server/api/pagination.ts';
import { parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { listReviewsForUser } from '#lib/server/services/reviews.ts';

const paramsSchema = z.object({
	userId: z.uuid()
});

/** GET /users/{userId}/reviews — listUserReviews */
export const GET: RequestHandler = async (event) => {
	try {
		requireActiveAccount(event.locals);
		const { userId } = parseParams(event.params, paramsSchema);
		const pagination = parsePagination(event.url);

		const page = await listReviewsForUser(db, {
			userId,
			limit: pagination.pageSize,
			offset: pagination.offset
		});

		if (page === null) {
			throw new ApiError('NOT_FOUND');
		}

		return Response.json({
			...paged(page.items.map(toReview), page.total, pagination),
			ratingAvg: page.ratingAvg,
			ratingCount: page.ratingCount
		});
	} catch (error) {
		return handleApiError(error);
	}
};
