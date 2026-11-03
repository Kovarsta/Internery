import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { parseJson, parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { submitReport } from '#lib/server/services/reports.ts';

const paramsSchema = z.object({
	jobId: z.uuid()
});

const bodySchema = z.object({
	reason: z.string().trim().min(1).max(500)
});

/** POST /jobs/{jobId}/reports - reportJob */
export const POST: RequestHandler = async (event) => {
	try {
		const student = requireRole(event.locals, ['STUDENT']);
		const { jobId } = parseParams(event.params, paramsSchema);
		const body = await parseJson(event.request, bodySchema);

		const result = await submitReport(db, {
			jobId,
			reporterId: student.id,
			reason: body.reason
		});

		return Response.json(result, { status: 201 });
	} catch (error) {
		return handleApiError(error);
	}
};
