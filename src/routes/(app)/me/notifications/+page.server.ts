import { apiGet } from '#lib/api/client.ts';
import type { Notification, Paged } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 50;

/**
 * Loads `/me/notifications`.
 *
 * The unread filter stays in the URL. The unread count is loaded separately so
 * the header still shows the true total while the list is filtered.
 */
export const load: PageServerLoad = async (event) => {
	const unreadOnly = event.url.searchParams.get('unread') === 'true';
	const query = new URLSearchParams({ pageSize: String(PAGE_SIZE) });

	if (unreadOnly) {
		query.set('unread', 'true');
	}

	const [notifications, unread] = await Promise.all([
		apiGet<Paged<Notification>>(event, `/api/v1/me/notifications?${query}`),
		apiGet<{ unread: number }>(event, '/api/v1/me/notifications/unread-count')
	]);

	return { notifications, unreadCount: unread.unread, unreadOnly };
};
