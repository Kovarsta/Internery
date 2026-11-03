import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { parseOptionalJson, parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { removeReview } from '#lib/server/services/admin.ts';

const paramsSchema = z.object({
	reviewId: z.uuid()
});

const bodySchema = z.object({
	reason: z.string().trim().max(500).optional()
});

/** POST /admin/reviews/{reviewId}/remove - adminRemoveReview */
export const POST: RequestHandler = async (event) => {
	try {
		const admin = requireRole(event.locals, ['ADMIN']);
		const { reviewId } = parseParams(event.params, paramsSchema);
		const body = await parseOptionalJson(event.request, bodySchema);
		const reason = body?.reason ? body.reason : null;

		await removeReview(db, { adminId: admin.id, reviewId, reason });

		return new Response(null, { status: 204 });
	} catch (error) {
		return handleApiError(error);
	}
};
