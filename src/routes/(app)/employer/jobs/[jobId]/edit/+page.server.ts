import { error, fail, redirect } from '@sveltejs/kit';
import { apiGet } from '#lib/api/client.ts';
import { readErrorMessage } from '#lib/api/error-message.ts';
import type { Category, JobDetail } from '#lib/api/types.ts';
import {
	findJobFormProblem,
	readJobForm,
	toJobPayload,
	type JobFormValues
} from '#lib/job-form.ts';
import type { Actions, PageServerLoad } from './$types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Loads `/employer/jobs/[jobId]/edit`.
 *
 * Only the owner can edit, and only while the job is `HIRING` (AC-18.2). The form starts from the
 * stored job so a partial edit still sends the whole field set.
 */
export const load: PageServerLoad = async (event) => {
	if (!UUID_PATTERN.test(event.params.jobId)) {
		error(404, 'That job does not exist.');
	}

	const [job, categories] = await Promise.all([
		apiGet<JobDetail>(event, `/api/v1/jobs/${event.params.jobId}`),
		apiGet<Category[]>(event, '/api/v1/categories')
	]);

	if (job.employer.userId !== event.locals.user?.id) {
		error(403, 'You can only edit your own jobs.');
	}

	if (job.status !== 'HIRING') {
		error(409, 'Only hiring jobs can be edited.');
	}

	return {
		job,
		categories,
		values: toFormValues(job)
	};
};

/**
 * Saves the job through `PATCH /jobs/{jobId}`.
 *
 * The API re-runs the scam scan and enforces the date and capacity rules. The checks here only
 * cover what a person can fix on the form.
 */
export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const values = readJobForm(form);
		const problem = findJobFormProblem(values);

		if (problem) {
			return fail(400, { message: problem, values });
		}

		const response = await event.fetch(`/api/v1/jobs/${event.params.jobId}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(toJobPayload(values))
		});

		if (!response.ok) {
			return fail(response.status, {
				message: await readErrorMessage(response),
				values
			});
		}

		redirect(303, '/employer/jobs?updated=1');
	}
};

function toFormValues(job: JobDetail): JobFormValues {
	return {
		title: job.title,
		categoryId: job.category.id,
		description: job.description,
		locationId: job.locationId,
		daysOfWeek: job.daysOfWeek,
		startTime: job.startTime,
		endTime: job.endTime,
		scheduleNote: job.scheduleNote ?? '',
		salaryAmount: String(job.salaryAmount),
		salaryType: job.salaryType,
		startDate: job.startDate,
		endDate: job.endDate,
		positionsNeeded: String(job.positionsNeeded)
	};
}
