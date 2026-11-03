import { fail, redirect } from '@sveltejs/kit';
import { apiGet } from '#lib/api/client.ts';
import { readErrorMessage } from '#lib/api/error-message.ts';
import type { Category } from '#lib/api/types.ts';
import { findJobFormProblem, readJobForm, toJobPayload } from '#lib/job-form.ts';
import type { Actions, PageServerLoad } from './$types';

/** Loads the categories the employer can post into. */
export const load: PageServerLoad = async (event) => {
	const categories = await apiGet<Category[]>(event, '/api/v1/categories');

	return { categories };
};

/**
 * Publishes a job through `POST /jobs`.
 *
 * The checks here only catch what a person can fix on the form; the API still
 * validates every field, enforces an active category and flags scam keywords.
 * The API's message is returned as-is when it rejects the payload.
 */
export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const values = readJobForm(form);
		const problem = findJobFormProblem(values);

		if (problem) {
			return fail(400, { message: problem, values });
		}

		const response = await event.fetch('/api/v1/jobs', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(toJobPayload(values))
		});

		if (!response.ok) {
			return fail(response.status, {
				message: await readErrorMessage(response),
				values
			});
		}

		redirect(303, '/employer/jobs?created=1');
	}
};
