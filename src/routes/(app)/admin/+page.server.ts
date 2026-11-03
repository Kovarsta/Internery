import { apiGet } from '#lib/api/client.ts';
import type { PlatformStats } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

/**
 * Loads `/admin`.
 *
 * The optional `from`/`to` dates limit every count to rows created in that
 * window. Values that are not `YYYY-MM-DD` are ignored instead of being sent to
 * the API, so a hand-edited URL shows all-time counts rather than an error.
 */
export const load: PageServerLoad = async (event) => {
	const from = readDay(event.url.searchParams.get('from'));
	const to = readDay(event.url.searchParams.get('to'));
	const query = new URLSearchParams();

	if (from) {
		query.set('from', from);
	}

	if (to) {
		query.set('to', to);
	}

	const path = query.size > 0 ? `/api/v1/admin/stats?${query}` : '/api/v1/admin/stats';
	const stats = await apiGet<PlatformStats>(event, path);

	return { stats, from: from ?? '', to: to ?? '' };
};

/** Accepts a date-only value; anything else means "no bound". */
function readDay(value: string | null): string | undefined {
	if (value === null || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return undefined;
	}

	return value;
}
