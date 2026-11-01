import type { RequestHandler } from './$types';
import { z } from 'zod';
import { WORK_RECORD_SECRET } from '$app/env/private';
import { requireRole } from '#lib/server/api/auth.ts';
import { ApiError, handleApiError } from '#lib/server/api/errors.ts';
import { toReview } from '#lib/server/api/mappers.ts';
import { parseJson, parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { createReview } from '#lib/server/services/reviews.ts';

const paramsSchema = z.object({
	jobId: z.uuid()
});

const reviewSchema = z.object({
	revieweeId: z.uuid(),
	rating: z.number().int().min(1).max(5),
	comment: z
		.string()
		.trim()
		.max(500)
		.nullable()
		.optional()
		.transform((value) => (value ? value : null))
});

/** POST /jobs/{jobId}/reviews — createReview */
export const POST: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['STUDENT', 'EMPLOYER']);
		const { jobId } = parseParams(event.params, paramsSchema);

		// Fail closed: an employer's review issues the student's work record, and
		// a review saved without the key could never get its record issued.
		if (!WORK_RECORD_SECRET) {
			throw new ApiError('INTERNAL_ERROR', 'Work-record signing is not configured.');
		}

		const body = await parseJson(event.request, reviewSchema);

		const { review, workRecordId } = await createReview(db, WORK_RECORD_SECRET, {
			jobId,
			reviewerId: user.id,
			revieweeId: body.revieweeId,
			rating: body.rating,
			comment: body.comment
		});

		return Response.json({ review: toReview(review), workRecordId }, { status: 201 });
	} catch (error) {
		return handleApiError(error);
	}
};
