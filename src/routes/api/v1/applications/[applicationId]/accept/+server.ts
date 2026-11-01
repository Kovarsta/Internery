import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toApplication } from '#lib/server/api/mappers.ts';
import { parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { acceptApplication } from '#lib/server/services/applications.ts';

const paramsSchema = z.object({
	applicationId: z.uuid()
});

/** POST /applications/{applicationId}/accept — acceptApplication */
export const POST: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['EMPLOYER']);
		const { applicationId } = parseParams(event.params, paramsSchema);

		const { application, jobFilled } = await acceptApplication(db, user.id, applicationId);

		return Response.json({
			application: toApplication(application),
			jobFilled
		});
	} catch (error) {
		return handleApiError(error);
	}
};
