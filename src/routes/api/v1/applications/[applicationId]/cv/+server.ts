import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { ApiError, handleApiError } from '#lib/server/api/errors.ts';
import { fileDownload } from '#lib/server/api/downloads.ts';
import { parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { getApplicationCv } from '#lib/server/services/applications.ts';
import { storage } from '#lib/server/storage/index.ts';

const paramsSchema = z.object({
	applicationId: z.uuid()
});

/**
 * GET /applications/{applicationId}/cv - downloadApplicationCv
 *
 * Streams the CV snapshot taken when the student applied. The employer who owns
 * the job and the applicant can read it; everyone else is refused by the
 * service with `403`.
 */
export const GET: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['EMPLOYER', 'STUDENT']);
		const { applicationId } = parseParams(event.params, paramsSchema);

		const cv = await getApplicationCv(db, user, applicationId);
		const object = await storage.getObject(cv.key);

		if (!object) {
			throw new ApiError('NOT_FOUND');
		}

		return fileDownload(object, cv.fileName);
	} catch (error) {
		return handleApiError(error);
	}
};
