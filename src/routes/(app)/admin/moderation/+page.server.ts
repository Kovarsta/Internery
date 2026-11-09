import { apiGet } from '#lib/api/client.ts';
import type { ModerationItem, Paged } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 20;

/**
 * Loads `/admin/moderation`, oldest waiting item first.
 *
 * `q` narrows the queue by job title before pagination, so the page and the
 * total always describe the same search.
 */
export const load: PageServerLoad = async (event) => {
	const search = (event.url.searchParams.get('q') ?? '').trim();
	const requestedPage = Number(event.url.searchParams.get('page') ?? '1');
	const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
	const query = new URLSearchParams({ pageSize: String(PAGE_SIZE), page: String(page) });

	if (search !== '') {
		query.set('q', search);
	}

	const items = await apiGet<Paged<ModerationItem>>(
		event,
		`/api/v1/admin/moderation-queue?${query}`
	);

	return {
		items,
		search,
		filterQuery: search === '' ? '' : new URLSearchParams({ q: search }).toString()
	};
};
