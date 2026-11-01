import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toStudentProfile } from '#lib/server/api/mappers.ts';
import { parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { getApplicantProfile } from '#lib/server/services/applications.ts';

const paramsSchema = z.object({
	applicationId: z.uuid()
});

/** GET /applications/{applicationId}/student-profile — getApplicantProfile */
export const GET: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['EMPLOYER']);
		const { applicationId } = parseParams(event.params, paramsSchema);

		const { student, profile } = await getApplicantProfile(db, user.id, applicationId);

		return Response.json(toStudentProfile(profile, student));
	} catch (error) {
		return handleApiError(error);
	}
};
