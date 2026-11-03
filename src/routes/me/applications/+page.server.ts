import { apiGet } from '#lib/api/client.ts';
import type { Application, ApplicationStatus, Paged } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 50;

/** Accepts only the four application states; anything else means "all". */
function isApplicationStatus(value: string | null): value is ApplicationStatus {
	return (
		value === 'PENDING' || value === 'ACCEPTED' || value === 'REJECTED' || value === 'WITHDRAWN'
	);
}

/**
 * Loads `/me/applications`.
 *
 * The status filter is optional and kept in the URL, so a filtered list can be
 * shared or bookmarked.
 */
export const load: PageServerLoad = async (event) => {
	const requestedStatus = event.url.searchParams.get('status');
	const status = isApplicationStatus(requestedStatus) ? requestedStatus : null;

	const query = new URLSearchParams({ pageSize: String(PAGE_SIZE) });

	if (status) {
		query.set('status', status);
	}

	const applications = await apiGet<Paged<Application>>(event, `/api/v1/me/applications?${query}`);

	return { applications, status };
};
