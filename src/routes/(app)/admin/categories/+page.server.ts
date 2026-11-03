import { apiGet } from '#lib/api/client.ts';
import type { Category } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

/**
 * Loads `/admin/categories` from `GET /admin/categories`.
 *
 * That admin read includes deactivated categories, unlike the public
 * `GET /categories`, so a category can be renamed or reactivated here.
 */
export const load: PageServerLoad = async (event) => {
	const categories = await apiGet<Category[]>(event, '/api/v1/admin/categories');

	return { categories };
};
