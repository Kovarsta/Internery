import type { RequestHandler } from './$types';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toStudentProfile } from '#lib/server/api/mappers.ts';
import { db } from '#lib/server/db/index.ts';
import { getStudentProfile } from '#lib/server/services/profiles.ts';

/** GET /me/student-profile — getStudentProfile */
export const GET: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['STUDENT']);
		const profile = await getStudentProfile(db, user.id);

		return Response.json(toStudentProfile(profile, user));
	} catch (error) {
		return handleApiError(error);
	}
};
