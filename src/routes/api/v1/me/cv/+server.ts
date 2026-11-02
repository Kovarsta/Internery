import type { RequestHandler } from './$types';
import { requireRole } from '#lib/server/api/auth.ts';
import { ApiError, handleApiError } from '#lib/server/api/errors.ts';
import { fileDownload } from '#lib/server/api/downloads.ts';
import { toStudentProfile } from '#lib/server/api/mappers.ts';
import { parseFormData, readCvFile } from '#lib/server/api/uploads.ts';
import { db } from '#lib/server/db/index.ts';
import { getOwnCv, removeOwnCv, saveCv } from '#lib/server/services/cv.ts';
import { getStudentProfile } from '#lib/server/services/profiles.ts';
import { storage } from '#lib/server/storage/index.ts';

/**
 * PUT /me/cv - uploadCv
 *
 * Validates the file as PDF or DOCX, stores it under a new key and returns the
 * updated profile. Applications keep their old snapshot, so replacing the CV
 * only changes what future applications attach.
 */
export const PUT: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['STUDENT']);
		const form = await parseFormData(event.request);
		const file = form.get('file');

		if (!(file instanceof File)) {
			throw new ApiError('VALIDATION_ERROR', 'Request validation failed.', [
				{ field: 'file', message: 'Attach the CV in the file field.' }
			]);
		}

		const upload = await readCvFile(file);
		await saveCv(db, storage, user.id, upload);

		const profile = await getStudentProfile(db, user.id);

		return Response.json(toStudentProfile(profile, user));
	} catch (error) {
		return handleApiError(error);
	}
};

/**
 * GET /me/cv - downloadOwnCv
 *
 * Streams the student's own CV from the private bucket. The stored key never
 * leaves the server, and the response is marked private and uncached.
 */
export const GET: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['STUDENT']);
		const cv = await getOwnCv(db, user.id);

		if (!cv) {
			throw new ApiError('NOT_FOUND');
		}

		const object = await storage.getObject(cv.key);

		// The columns can outlive the object after a failed cleanup.
		if (!object) {
			throw new ApiError('NOT_FOUND');
		}

		return fileDownload(object, cv.fileName);
	} catch (error) {
		return handleApiError(error);
	}
};

/**
 * DELETE /me/cv - deleteCv
 *
 * Clears the four CV columns and answers `204`. Applications keep their own
 * snapshot, so the object itself is left for the reference-aware sweep.
 */
export const DELETE: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['STUDENT']);
		await removeOwnCv(db, user.id);

		return new Response(null, { status: 204 });
	} catch (error) {
		return handleApiError(error);
	}
};
