import { error } from '@sveltejs/kit';
import { apiGet } from '#lib/api/client.ts';
import type { Applicant, JobDetail, Paged } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Loads `/employer/jobs/[jobId]`.
 *
 * The job detail supplies the hero facts and the applicant total supplies the
 * count. Only the owning employer can open the workspace.
 */
export const load: PageServerLoad = async (event) => {
	if (!UUID_PATTERN.test(event.params.jobId)) {
		error(404, 'That job does not exist.');
	}

	const [job, applicants] = await Promise.all([
		apiGet<JobDetail>(event, `/api/v1/jobs/${event.params.jobId}`),
		apiGet<Paged<Applicant>>(event, `/api/v1/jobs/${event.params.jobId}/applications?pageSize=1`)
	]);

	if (job.employer.userId !== event.locals.user?.id) {
		error(403, 'You can only manage your own jobs.');
	}

	return {
		job,
		applicantCount: applicants.total
	};
};
