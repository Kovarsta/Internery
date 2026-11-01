import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toApplicant, toApplication } from '#lib/server/api/mappers.ts';
import { paged, parsePagination } from '#lib/server/api/pagination.ts';
import { parseJson, parseParams, parseQuery } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { applyToJob, listJobApplicants } from '#lib/server/services/applications.ts';

const paramsSchema = z.object({
	jobId: z.uuid()
});

const applySchema = z.object({
	message: z.string().max(1000).nullable().optional(),
	attachCv: z.boolean().default(true)
});

const querySchema = z.object({
	status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']).optional()
});

/** POST /jobs/{jobId}/applications — applyToJob */
export const POST: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['STUDENT']);
		const { jobId } = parseParams(event.params, paramsSchema);
		const body = await parseJson(event.request, applySchema);

		const application = await applyToJob(db, { id: user.id, name: user.name }, jobId, {
			message: body.message ?? null,
			attachCv: body.attachCv
		});

		return Response.json(toApplication(application), { status: 201 });
	} catch (error) {
		return handleApiError(error);
	}
};

/** GET /jobs/{jobId}/applications — listJobApplications */
export const GET: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['EMPLOYER']);
		const { jobId } = parseParams(event.params, paramsSchema);
		const query = parseQuery(event.url, querySchema);
		const pagination = parsePagination(event.url);

		const { items, total } = await listJobApplicants(db, {
			employerId: user.id,
			jobId,
			status: query.status,
			limit: pagination.pageSize,
			offset: pagination.offset
		});

		return Response.json(paged(items.map(toApplicant), total, pagination));
	} catch (error) {
		return handleApiError(error);
	}
};
