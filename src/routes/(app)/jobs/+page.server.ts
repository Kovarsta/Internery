import { apiGet, apiGetOptional } from '#lib/api/client.ts';
import type { Category, JobSummary, Location, Paged } from '#lib/api/types.ts';
import { readJobBrowseFilters, toJobSearchQuery } from '#lib/job-search.ts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 8;

/**
 * Loads `/jobs` from the public search endpoint.
 *
 * The page reads filters from the URL, sends them to `GET /jobs` and passes the paged result to
 * the component tree. Pagination keeps every filter except `page`.
 */
export const load: PageServerLoad = async (event) => {
	const filters = readJobBrowseFilters(event.url.searchParams);
	const page = readPage(event.url.searchParams.get('page'));

	const query = toJobSearchQuery(filters);
	query.set('page', String(page));
	query.set('pageSize', String(PAGE_SIZE));

	const [jobs, categories, location] = await Promise.all([
		apiGet<Paged<JobSummary>>(event, `/api/v1/jobs?${query}`),
		apiGet<Category[]>(event, '/api/v1/categories'),
		filters.locationId
			? apiGetOptional<Location>(event, `/api/v1/locations/${filters.locationId}`)
			: Promise.resolve(null)
	]);

	const paginationQuery = new URLSearchParams(query);
	paginationQuery.delete('page');

	return {
		jobs,
		categories,
		locationLabel: location?.name,
		filters,
		page,
		pageSize: PAGE_SIZE,
		paginationQuery: paginationQuery.toString()
	};
};

function readPage(value: string | null): number {
	const page = Number(value);

	return Number.isInteger(page) && page > 0 ? page : 1;
}
