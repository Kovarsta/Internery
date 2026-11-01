import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toApplication } from '#lib/server/api/mappers.ts';
import { parseOptionalJson, parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { rejectApplication } from '#lib/server/services/applications.ts';

const paramsSchema = z.object({
	applicationId: z.uuid()
});

const rejectSchema = z.object({
	reason: z
		.string()
		.trim()
		.max(500)
		.nullable()
		.optional()
		.transform((value) => (value ? value : null))
});

/** POST /applications/{applicationId}/reject — rejectApplication */
export const POST: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['EMPLOYER']);
		const { applicationId } = parseParams(event.params, paramsSchema);
		const body = await parseOptionalJson(event.request, rejectSchema);

		const application = await rejectApplication(db, user.id, applicationId, body?.reason ?? null);

		return Response.json(toApplication(application));
	} catch (error) {
		return handleApiError(error);
	}
};
