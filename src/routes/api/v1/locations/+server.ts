import type { RequestHandler } from './$types';
import { z } from 'zod';
import { handleApiError } from '#lib/server/api/errors.ts';
import { noStoreJson } from '#lib/server/api/responses.ts';
import { parseQuery } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { searchLocations } from '#lib/server/services/locations.ts';

const querySchema = z.object({
	q: z.string().trim().max(100).optional(),
	country: z
		.string()
		.trim()
		.length(2)
		.transform((value) => value.toUpperCase())
		.optional(),
	limit: z.coerce.number().int().min(1).max(20).default(10)
});

/** GET /locations - searchLocations */
export const GET: RequestHandler = async (event) => {
	try {
		const query = parseQuery(event.url, querySchema);

		const items = await searchLocations(db, {
			query: query.q ?? '',
			countryCode: query.country,
			limit: query.limit
		});

		return noStoreJson(items);
	} catch (error) {
		return handleApiError(error);
	}
};
