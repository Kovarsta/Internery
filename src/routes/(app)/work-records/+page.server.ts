import { apiGet } from '#lib/api/client.ts';
import type { Paged, WorkRecordCard } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 12;

/**
 * Loads `/work-records` from the public directory.
 *
 * Only records a student chose to publish are returned, newest publication first. The page number
 * stays in the URL so a page of the directory can be linked.
 */
export const load: PageServerLoad = async (event) => {
	const page = readPage(event.url.searchParams.get('page'));
	const query = new URLSearchParams({
		page: String(page),
		pageSize: String(PAGE_SIZE)
	});

	const records = await apiGet<Paged<WorkRecordCard>>(event, `/api/v1/work-records?${query}`);

	const paginationQuery = new URLSearchParams(query);
	paginationQuery.delete('page');

	return {
		records,
		page,
		pageSize: PAGE_SIZE,
		paginationQuery: paginationQuery.toString()
	};
};

function readPage(value: string | null): number {
	const page = Number(value);

	return Number.isInteger(page) && page > 0 ? page : 1;
}
