import { apiGet } from '#lib/api/client.ts';
import type { JobDetail, StudentProfile } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

/**
 * Loads `/employer/jobs/[jobId]/applicants/[applicationId]`.
 *
 * The profile comes from `GET /applications/{applicationId}/student-profile`, which only the
 * employer who owns the job may read. The job supplies the title and the back link.
 */
export const load: PageServerLoad = async (event) => {
	const [job, profile] = await Promise.all([
		apiGet<JobDetail>(event, `/api/v1/jobs/${event.params.jobId}`),
		apiGet<StudentProfile>(
			event,
			`/api/v1/applications/${event.params.applicationId}/student-profile`
		)
	]);

	return { job, profile };
};
