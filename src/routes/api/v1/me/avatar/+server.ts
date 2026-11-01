import type { RequestHandler } from './$types';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { notImplemented } from '#lib/server/api/not-implemented.ts';
import { db } from '#lib/server/db/index.ts';
import { resetAvatar } from '#lib/server/services/users.ts';

/** PUT /me/avatar — uploadAvatar */
export const PUT: RequestHandler = () => notImplemented();

/**
 * DELETE /me/avatar — deleteAvatar
 *
 * Points the profile at the shared blank key, which also shadows the OAuth
 * provider image. Answers `204` with no body whether or not a picture existed,
 * so the call is safe to repeat.
 */
export const DELETE: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['STUDENT', 'EMPLOYER', 'ADMIN']);
		await resetAvatar(db, user.id);

		return new Response(null, { status: 204 });
	} catch (error) {
		return handleApiError(error);
	}
};
