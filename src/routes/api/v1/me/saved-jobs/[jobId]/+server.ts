import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { saveJob, unsaveJob } from '#lib/server/services/saved-jobs.ts';

const paramsSchema = z.object({
	jobId: z.uuid()
});

/** PUT /me/saved-jobs/{jobId} — saveJob */
export const PUT: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['STUDENT']);
		const { jobId } = parseParams(event.params, paramsSchema);

		await saveJob(db, user.id, jobId);

		return new Response(null, { status: 204 });
	} catch (error) {
		return handleApiError(error);
	}
};

/** DELETE /me/saved-jobs/{jobId} — unsaveJob */
export const DELETE: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['STUDENT']);
		const { jobId } = parseParams(event.params, paramsSchema);

		await unsaveJob(db, user.id, jobId);

		return new Response(null, { status: 204 });
	} catch (error) {
		return handleApiError(error);
	}
};
