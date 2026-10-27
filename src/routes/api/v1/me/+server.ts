import type { RequestHandler } from './$types';
import { requireActiveAccount } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toUserMe } from '#lib/server/api/mappers.ts';
import { notImplemented } from '#lib/server/api/not-implemented.ts';
import { db } from '#lib/server/db/index.ts';
import { getUserProfile } from '#lib/server/services/users.ts';

/** GET /me — getMe */
export const GET: RequestHandler = async (event) => {
	try {
		const user = requireActiveAccount(event.locals);
		const profile = await getUserProfile(db, user.id);

		return Response.json(toUserMe(user, profile));
	} catch (error) {
		return handleApiError(error);
	}
};

/** PATCH /me — updateMe */
export const PATCH: RequestHandler = () => notImplemented();
