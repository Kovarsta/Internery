import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toEmployerProfile } from '#lib/server/api/mappers.ts';
import { parseJson } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { getEmployerProfile, saveEmployerProfile } from '#lib/server/services/profiles.ts';

const bodySchema = z.object({
	orgName: z.string().trim().min(1).max(200),
	orgType: z.enum(['COMPANY', 'INDIVIDUAL']),
	description: z.string().trim().max(2000).nullable().default(null),
	address: z.string().trim().max(300).nullable().default(null),
	contactPhone: z.string().trim().max(20).nullable().default(null)
});

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

/** PUT /me/employer-profile — saveEmployerProfile */
export const PUT: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['EMPLOYER']);
		const input = await parseJson(event.request, bodySchema);
		const profile = await saveEmployerProfile(db, user.id, input);

		return Response.json(toEmployerProfile(profile, user.id));
	} catch (error) {
		return handleApiError(error);
	}
};
