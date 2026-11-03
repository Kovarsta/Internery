import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toCategory } from '#lib/server/api/mappers.ts';
import { parseJson } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { createCategory, listAllCategories } from '#lib/server/services/admin.ts';

const bodySchema = z.object({
	name: z.string().trim().min(1).max(100)
});

/**
 * GET /admin/categories - adminListCategories
 *
 * Lists every category, including the deactivated ones, so an admin can rename
 * or reactivate them. The public `GET /categories` only returns active rows.
 */
export const GET: RequestHandler = async (event) => {
	try {
		requireRole(event.locals, ['ADMIN']);

		const categories = await listAllCategories(db);

		return Response.json(categories.map(toCategory));
	} catch (error) {
		return handleApiError(error);
	}
};

/** POST /admin/categories - adminCreateCategory */
export const POST: RequestHandler = async (event) => {
	try {
		requireRole(event.locals, ['ADMIN']);
		const body = await parseJson(event.request, bodySchema);

		const category = await createCategory(db, { name: body.name });

		return Response.json(toCategory(category), { status: 201 });
	} catch (error) {
		return handleApiError(error);
	}
};
