import type { RequestHandler } from './$types';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toCategory } from '#lib/server/api/mappers.ts';
import { db } from '#lib/server/db/index.ts';
import { listActiveCategories } from '#lib/server/services/categories.ts';

/** GET /categories — listCategories */
export const GET: RequestHandler = async () => {
	try {
		const categories = await listActiveCategories(db);

		return Response.json(categories.map(toCategory));
	} catch (error) {
		return handleApiError(error);
	}
};
