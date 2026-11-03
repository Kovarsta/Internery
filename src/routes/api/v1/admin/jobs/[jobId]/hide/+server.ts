import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toJobDetail } from '#lib/server/api/mappers.ts';
import { parseJson, parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { hideJob } from '#lib/server/services/admin.ts';

const paramsSchema = z.object({
	jobId: z.uuid()
});

const bodySchema = z.object({
	reason: z.string().trim().min(1).max(500)
});

/** POST /admin/jobs/{jobId}/hide - adminHideJob */
export const POST: RequestHandler = async (event) => {
	try {
		const admin = requireRole(event.locals, ['ADMIN']);
		const { jobId } = parseParams(event.params, paramsSchema);
		const body = await parseJson(event.request, bodySchema);

		const job = await hideJob(db, { adminId: admin.id, jobId, reason: body.reason });

		return Response.json(toJobDetail(job, null));
	} catch (error) {
		return handleApiError(error);
	}
};
