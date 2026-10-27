import type { RequestHandler } from './$types';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toEmployerProfile } from '#lib/server/api/mappers.ts';
import { db } from '#lib/server/db/index.ts';
import { getEmployerProfile } from '#lib/server/services/profiles.ts';

/** GET /me/employer-profile — getEmployerProfile */
export const GET: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['EMPLOYER']);
		const profile = await getEmployerProfile(db, user.id);

		return Response.json(toEmployerProfile(profile, user.id));
	} catch (error) {
		return handleApiError(error);
	}
};
