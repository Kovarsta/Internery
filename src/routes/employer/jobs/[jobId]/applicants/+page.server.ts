import { apiGet } from '#lib/api/client.ts';
import type { Applicant, ApplicationStatus, JobDetail, Paged } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 50;

/** Accepts only the four application states; anything else means "all". */
function isApplicationStatus(value: string | null): value is ApplicationStatus {
	return (
		value === 'PENDING' || value === 'ACCEPTED' || value === 'REJECTED' || value === 'WITHDRAWN'
	);
}

/**
 * Loads `/employer/jobs/[jobId]/applicants`.
 *
 * The job supplies the title for the header; the applicants come from
 * `GET /jobs/{jobId}/applications`. The status filter stays in the URL.
 */
export const load: PageServerLoad = async (event) => {
	const requestedStatus = event.url.searchParams.get('status');
	const status = isApplicationStatus(requestedStatus) ? requestedStatus : null;

	const query = new URLSearchParams({ pageSize: String(PAGE_SIZE) });

	if (status) {
		query.set('status', status);
	}

	const [job, applicants] = await Promise.all([
		apiGet<JobDetail>(event, `/api/v1/jobs/${event.params.jobId}`),
		apiGet<Paged<Applicant>>(event, `/api/v1/jobs/${event.params.jobId}/applications?${query}`)
	]);

	return { job, applicants, status };
};
