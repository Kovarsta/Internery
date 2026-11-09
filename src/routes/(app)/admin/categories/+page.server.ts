import { apiGet } from '#lib/api/client.ts';
import type { Category } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

/**
 * Loads `/admin/categories` from `GET /admin/categories`.
 *
 * That admin read includes deactivated categories, unlike the public
 * `GET /categories`, so a category can be renamed or reactivated here. The
 * taxonomy is bounded, so the whole list is loaded and the page filters it by
 * name instead of adding a second paged endpoint.
 */
export const load: PageServerLoad = async (event) => {
	const search = (event.url.searchParams.get('q') ?? '').trim();
	const categories = await apiGet<Category[]>(event, '/api/v1/admin/categories');
	const term = search.toLowerCase();
	const visible =
		term === ''
			? categories
			: categories.filter((category) => category.name.toLowerCase().includes(term));

	return {
		categories: visible,
		totalCategories: categories.length,
		search
	};
};
