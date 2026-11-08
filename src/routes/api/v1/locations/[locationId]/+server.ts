import type { RequestHandler } from './$types';
import { z } from 'zod';
import { ApiError, handleApiError } from '#lib/server/api/errors.ts';
import { noStoreJson } from '#lib/server/api/responses.ts';
import { parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { findLocationById } from '#lib/server/services/locations.ts';

const paramsSchema = z.object({
	locationId: z.uuid()
});

/** GET /locations/{locationId} - getLocation */
export const GET: RequestHandler = async (event) => {
	try {
		const { locationId } = parseParams(event.params, paramsSchema);
		const location = await findLocationById(db, locationId);

		if (!location) {
			throw new ApiError('NOT_FOUND');
		}

		return noStoreJson(location);
	} catch (error) {
		return handleApiError(error);
	}
};
