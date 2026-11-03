import { apiGet } from '#lib/api/client.ts';
import type { Applicant, JobDetail, Paged, StudentProfile } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

/**
 * Loads `/employer/jobs/[jobId]/applicants/[applicationId]`.
 *
 * The profile comes from `GET /applications/{applicationId}/student-profile`, which only the
 * employer who owns the job may read. The job supplies the title and the back link. The accepted
 * applicants decide whether the student can be reviewed: only an accepted student of a completed
 * job may receive a review.
 */
export const load: PageServerLoad = async (event) => {
	const [job, profile, acceptedApplicants] = await Promise.all([
		apiGet<JobDetail>(event, `/api/v1/jobs/${event.params.jobId}`),
		apiGet<StudentProfile>(
			event,
			`/api/v1/applications/${event.params.applicationId}/student-profile`
		),
		apiGet<Paged<Applicant>>(
			event,
			`/api/v1/jobs/${event.params.jobId}/applications?status=ACCEPTED&pageSize=50`
		)
	]);

	const acceptedApplicant =
		acceptedApplicants.items.find((applicant) => applicant.id === event.params.applicationId) ??
		null;

	return { job, profile, acceptedApplicant };
};
