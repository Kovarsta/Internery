import type { RequestHandler } from './$types';
import { requireRole } from '#lib/server/api/auth.ts';
import { ApiError, handleApiError } from '#lib/server/api/errors.ts';
import { toVerificationRequest } from '#lib/server/api/mappers.ts';
import { notImplemented } from '#lib/server/api/not-implemented.ts';
import { db } from '#lib/server/db/index.ts';
import { findLatestVerificationRequest } from '#lib/server/services/verification.ts';

/** GET /me/verification-request — getMyVerificationRequest */
export const GET: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['EMPLOYER']);
		const request = await findLatestVerificationRequest(db, user.id);

		if (!request) {
			throw new ApiError('NOT_FOUND');
		}

		return Response.json(toVerificationRequest(request));
	} catch (error) {
		return handleApiError(error);
	}
};

/** POST /me/verification-request — submitVerificationRequest */
export const POST: RequestHandler = () => notImplemented();
