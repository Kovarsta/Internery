import { apiGet } from '#lib/api/client.ts';
import type { JobStatus, MyJob, Paged } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 20;

/** Accepts only the four job states; anything else means "all". */
function isJobStatus(value: string | null): value is JobStatus {
	return value === 'HIRING' || value === 'FILLED' || value === 'COMPLETED' || value === 'CANCELLED';
}

/**
 * Loads `/employer/jobs`.
 *
 * The status filter stays in the URL. `created` is the flag left by the create
 * form's redirect, so the list can confirm the publish once.
 */
export const load: PageServerLoad = async (event) => {
	const requestedStatus = event.url.searchParams.get('status');
	const status = isJobStatus(requestedStatus) ? requestedStatus : null;

	const query = new URLSearchParams({ pageSize: String(PAGE_SIZE) });

	if (status) {
		query.set('status', status);
	}

	const jobs = await apiGet<Paged<MyJob>>(event, `/api/v1/me/jobs?${query}`);

	return {
		jobs,
		status,
		created: event.url.searchParams.get('created') === '1'
	};
};
