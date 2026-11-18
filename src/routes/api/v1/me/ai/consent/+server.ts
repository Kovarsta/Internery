import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { getAiConsent, setAiConsent } from '#lib/server/services/ai.ts';
import { parseJson } from '#lib/server/api/validation.ts';
import { noStoreJson } from '#lib/server/api/responses.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { db } from '#lib/server/db/index.ts';

const bodySchema = z.object({
	granted: z.boolean()
});

/** GET /me/ai/consent — getAiConsent */
export const GET: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['STUDENT']);
		const consent = await getAiConsent(db, user.id);

		return noStoreJson(consent);
	} catch (error) {
		return handleApiError(error);
	}
};

/** PUT /me/ai/consent — setAiConsent */
export const PUT: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['STUDENT']);
		const body = await parseJson(event.request, bodySchema);
		const consent = await setAiConsent(db, user.id, body.granted);

		return noStoreJson(consent);
	} catch (error) {
		return handleApiError(error);
	}
};
