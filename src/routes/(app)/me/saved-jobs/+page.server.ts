import { apiGet } from '#lib/api/client.ts';
import type { JobSummary, Paged } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 20;

/**
 * Loads `/me/saved-jobs` from `GET /me/saved-jobs`.
 *
 * Hidden jobs are omitted by the API; closed jobs stay in the list with their status. Pagination
 * keeps the page in the URL.
 */
export const load: PageServerLoad = async (event) => {
	const page = readPage(event.url.searchParams.get('page'));

	const query = new URLSearchParams({
		page: String(page),
		pageSize: String(PAGE_SIZE)
	});

	const jobs = await apiGet<Paged<JobSummary>>(event, `/api/v1/me/saved-jobs?${query}`);

	const paginationQuery = new URLSearchParams(query);
	paginationQuery.delete('page');

	return {
		jobs,
		page,
		pageSize: PAGE_SIZE,
		paginationQuery: paginationQuery.toString()
	};
};

function readPage(value: string | null): number {
	const page = Number(value);

	return Number.isInteger(page) && page > 0 ? page : 1;
}
