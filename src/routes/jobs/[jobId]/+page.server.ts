import { error } from '@sveltejs/kit';
import { apiGet } from '#lib/api/client.ts';
import type { JobDetail } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Loads one job from `GET /jobs/{jobId}`.
 *
 * A malformed id is treated as missing, so the page never sends a request the API would reject
 * with a validation error.
 */
export const load: PageServerLoad = async (event) => {
	if (!UUID_PATTERN.test(event.params.jobId)) {
		error(404, 'That job does not exist.');
	}

	const job = await apiGet<JobDetail>(event, `/api/v1/jobs/${event.params.jobId}`);

	return { job };
};
