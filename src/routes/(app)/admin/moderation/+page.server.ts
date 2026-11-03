import { apiGet } from '#lib/api/client.ts';
import type { ModerationItem, Paged } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 20;

/** Loads `/admin/moderation`, oldest waiting item first. */
export const load: PageServerLoad = async (event) => {
	const requestedPage = Number(event.url.searchParams.get('page') ?? '1');
	const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
	const query = new URLSearchParams({ pageSize: String(PAGE_SIZE), page: String(page) });

	const items = await apiGet<Paged<ModerationItem>>(
		event,
		`/api/v1/admin/moderation-queue?${query}`
	);

	return { items };
};
