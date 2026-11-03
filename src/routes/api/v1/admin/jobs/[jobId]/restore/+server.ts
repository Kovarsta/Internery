import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toJobDetail } from '#lib/server/api/mappers.ts';
import { parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { restoreJob } from '#lib/server/services/admin.ts';

const paramsSchema = z.object({
	jobId: z.uuid()
});

/** POST /admin/jobs/{jobId}/restore - adminRestoreJob */
export const POST: RequestHandler = async (event) => {
	try {
		const admin = requireRole(event.locals, ['ADMIN']);
		const { jobId } = parseParams(event.params, paramsSchema);

		const job = await restoreJob(db, { adminId: admin.id, jobId });

		return Response.json(toJobDetail(job, null));
	} catch (error) {
		return handleApiError(error);
	}
};
