import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toStudentProfile } from '#lib/server/api/mappers.ts';
import { noStoreJson } from '#lib/server/api/responses.ts';
import { parseJson } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { getStudentProfile, saveStudentProfile } from '#lib/server/services/profiles.ts';

const bodySchema = z.object({
	university: z.string().trim().min(1).max(160),
	major: z.string().trim().min(1).max(160),
	skills: z.array(z.string().trim().max(50)).max(30).default([]),
	availability: z.string().trim().max(500).nullable().default(null),
	bio: z.string().trim().max(2000).nullable().default(null)
});

/** GET /me/student-profile — getStudentProfile */
export const GET: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['STUDENT']);
		const profile = await getStudentProfile(db, user.id);

		return noStoreJson(toStudentProfile(profile, user));
	} catch (error) {
		return handleApiError(error);
	}
};

/** PUT /me/student-profile — saveStudentProfile */
export const PUT: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['STUDENT']);
		const input = await parseJson(event.request, bodySchema);
		const profile = await saveStudentProfile(db, user.id, input);

		return Response.json(toStudentProfile(profile, user));
	} catch (error) {
		return handleApiError(error);
	}
};
