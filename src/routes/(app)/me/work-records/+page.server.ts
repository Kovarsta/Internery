import { apiGet } from '#lib/api/client.ts';
import type { Paged, WorkRecord } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 20;

/**
 * Loads `/me/work-records`.
 *
 * The API returns the signed records for the signed-in student, private and public. A record is
 * issued by the employer-to-student review, so an empty page means no completed job has been
 * reviewed yet.
 */
export const load: PageServerLoad = async (event) => {
	const page = readPage(event.url.searchParams.get('page'));
	const query = new URLSearchParams({
		page: String(page),
		pageSize: String(PAGE_SIZE)
	});

	const records = await apiGet<Paged<WorkRecord>>(event, `/api/v1/me/work-records?${query}`);

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
