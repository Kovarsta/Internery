import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toJobDetail } from '#lib/server/api/mappers.ts';
import { parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { closeJob } from '#lib/server/services/jobs.ts';

const paramsSchema = z.object({
	jobId: z.uuid()
});

/** POST /jobs/{jobId}/close - closeJob */
export const POST: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['EMPLOYER']);
		const { jobId } = parseParams(event.params, paramsSchema);

		const job = await closeJob(db, user.id, jobId);

		return Response.json(toJobDetail(job, null));
	} catch (error) {
		return handleApiError(error);
	}
};
