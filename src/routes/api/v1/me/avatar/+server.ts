import type { RequestHandler } from './$types';
import { requireRole } from '#lib/server/api/auth.ts';
import { ApiError, handleApiError } from '#lib/server/api/errors.ts';
import { toUserMe } from '#lib/server/api/mappers.ts';
import { parseFormData, readAvatarImage } from '#lib/server/api/uploads.ts';
import { db } from '#lib/server/db/index.ts';
import { getUserProfile, resetAvatar, saveAvatar } from '#lib/server/services/users.ts';
import { storage } from '#lib/server/storage/index.ts';

/**
 * PUT /me/avatar - uploadAvatar
 *
 * Validates the file signature, stores the image under a new key and returns
 * the updated account. The previous object is left for the reference-aware
 * sweep, which deletes it after the grace period.
 */
export const PUT: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['STUDENT', 'EMPLOYER', 'ADMIN']);
		const form = await parseFormData(event.request);
		const file = form.get('file');

		if (!(file instanceof File)) {
			throw new ApiError('VALIDATION_ERROR', 'Request validation failed.', [
				{ field: 'file', message: 'Attach the image in the file field.' }
			]);
		}

		const image = await readAvatarImage(file);
		await saveAvatar(db, storage, user.id, image);

		const profile = await getUserProfile(db, user.id);

		return Response.json(toUserMe(user, profile));
	} catch (error) {
		return handleApiError(error);
	}
};

/**
 * DELETE /me/avatar - deleteAvatar
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
