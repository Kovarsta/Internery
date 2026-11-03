import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toVerificationRequest } from '#lib/server/api/mappers.ts';
import { noStoreJson } from '#lib/server/api/responses.ts';
import { parseJson, parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { rejectVerification } from '#lib/server/services/admin.ts';

const paramsSchema = z.object({
	requestId: z.uuid()
});

const bodySchema = z.object({
	reason: z.string().trim().min(1).max(500)
});

/** POST /admin/verification-requests/{requestId}/reject - adminRejectVerification */
export const POST: RequestHandler = async (event) => {
	try {
		const admin = requireRole(event.locals, ['ADMIN']);
		const { requestId } = parseParams(event.params, paramsSchema);
		const body = await parseJson(event.request, bodySchema);

		const request = await rejectVerification(db, {
			adminId: admin.id,
			requestId,
			reason: body.reason
		});

		return noStoreJson(toVerificationRequest(request));
	} catch (error) {
		return handleApiError(error);
	}
};
