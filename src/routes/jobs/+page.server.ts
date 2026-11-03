import { apiGet } from '#lib/api/client.ts';
import type { Category, JobSummary, Paged } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 8;

type Filters = {
	query?: string;
	categoryId?: string;
	location?: string;
	sort: 'newest' | 'salary_desc';
	verifiedOnly: boolean;
};

/**
 * Loads `/jobs` from the public search endpoint.
 *
 * The page reads filters from the URL, sends them to `GET /jobs` and passes the paged result to
 * the component tree. Pagination keeps every filter except `page`.
 */
export const load: PageServerLoad = async (event) => {
	const params = event.url.searchParams;
	const filters = readFilters(params);
	const page = readPage(params.get('page'));

	const query = new URLSearchParams();
	query.set('page', String(page));
	query.set('pageSize', String(PAGE_SIZE));

	if (filters.query) query.set('q', filters.query);
	if (filters.categoryId) query.set('categoryId', filters.categoryId);
	if (filters.location) query.set('location', filters.location);
	if (filters.verifiedOnly) query.set('verifiedOnly', 'true');
	if (filters.sort === 'salary_desc') query.set('sort', 'salary_desc');

	const [jobs, categories] = await Promise.all([
		apiGet<Paged<JobSummary>>(event, `/api/v1/jobs?${query}`),
		apiGet<Category[]>(event, '/api/v1/categories')
	]);

	const paginationQuery = new URLSearchParams(query);
	paginationQuery.delete('page');

	return {
		jobs,
		categories,
		filters,
		page,
		pageSize: PAGE_SIZE,
		paginationQuery: paginationQuery.toString()
	};
};

/** Reads the supported filters, treating empty strings as absent. */
function readFilters(params: URLSearchParams): Filters {
	return {
		query: readText(params.get('q')),
		categoryId: readText(params.get('categoryId')),
		location: readText(params.get('location')),
		sort: params.get('sort') === 'salary_desc' ? 'salary_desc' : 'newest',
		verifiedOnly: params.get('verifiedOnly') === 'true'
	};
}

function readText(value: string | null): string | undefined {
	const trimmed = value?.trim();

	return trimmed ? trimmed : undefined;
}

function readPage(value: string | null): number {
	const page = Number(value);

	return Number.isInteger(page) && page > 0 ? page : 1;
}
