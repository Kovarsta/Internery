import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toVerificationRequest } from '#lib/server/api/mappers.ts';
import { noStoreJson } from '#lib/server/api/responses.ts';
import { parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { approveVerification } from '#lib/server/services/admin.ts';

const paramsSchema = z.object({
	requestId: z.uuid()
});

/** POST /admin/verification-requests/{requestId}/approve - adminApproveVerification */
export const POST: RequestHandler = async (event) => {
	try {
		const admin = requireRole(event.locals, ['ADMIN']);
		const { requestId } = parseParams(event.params, paramsSchema);

		const request = await approveVerification(db, { adminId: admin.id, requestId });

		return noStoreJson(toVerificationRequest(request));
	} catch (error) {
		return handleApiError(error);
	}
};
