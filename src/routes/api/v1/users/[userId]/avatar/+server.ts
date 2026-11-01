import type { RequestHandler } from './$types';
import { z } from 'zod';
import { ApiError, handleApiError } from '#lib/server/api/errors.ts';
import { parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { getAvatarKey } from '#lib/server/services/users.ts';
import { storage } from '#lib/server/storage/index.ts';

const paramsSchema = z.object({
	userId: z.uuid()
});

/**
 * GET /users/{userId}/avatar — getUserAvatar
 *
 * Public by contract. The bytes are streamed from the private bucket, so the
 * storage endpoint and credentials never reach the browser. The alternative,
 * a presigned URL, would hand out a shareable link and expose the bucket host.
 * See `docs/decisions/avatar-storage.md`.
 */
export const GET: RequestHandler = async (event) => {
	try {
		const { userId } = parseParams(event.params, paramsSchema);
		const avatarKey = await getAvatarKey(db, userId);

		if (!avatarKey) {
			throw new ApiError('NOT_FOUND');
		}

		const object = await storage.getObject(avatarKey);

		// The row can outlive the object after a failed cleanup, so a missing
		// object is a 404 just like a missing key.
		if (!object) {
			throw new ApiError('NOT_FOUND');
		}

		// Public profile data, so browsers and CDNs may cache it. The URL does
		// not carry a version yet, so a replaced picture can stay cached for a
		// day; adding `?v=` in the mapper will let this become `immutable`.
		// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
		const headers = new Headers({
			'Content-Type': object.contentType ?? 'application/octet-stream',
			'Cache-Control': 'public, max-age=86400'
		});

		if (object.etag) {
			headers.set('ETag', object.etag);
		}

		if (object.contentLength !== null) {
			headers.set('Content-Length', String(object.contentLength));
		}

		return new Response(object.body, { headers });
	} catch (error) {
		return handleApiError(error);
	}
};
