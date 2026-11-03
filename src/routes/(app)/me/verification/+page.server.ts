import { fail, redirect } from '@sveltejs/kit';
import { apiGet, apiGetOptional } from '#lib/api/client.ts';
import { readErrorMessage } from '#lib/api/error-message.ts';
import type { EmployerProfile, VerificationRequest } from '#lib/api/types.ts';
import type { Actions, PageServerLoad } from './$types';

type RequestFormValues = {
	orgName: string;
	contactInfo: string;
	websiteUrl: string;
};

/**
 * Loads `/me/verification`.
 *
 * The employer profile carries the badge state, and the latest request carries the outcome and
 * rejection reason. An employer who never applied has no request, which the API reports as `404`
 * and the load turns into `null`.
 */
export const load: PageServerLoad = async (event) => {
	const [profile, request] = await Promise.all([
		apiGet<EmployerProfile>(event, '/api/v1/me/employer-profile'),
		apiGetOptional<VerificationRequest>(event, '/api/v1/me/verification-request')
	]);

	return {
		profile,
		request,
		submitted: event.url.searchParams.get('submitted') === '1'
	};
};

/**
 * Submits `POST /me/verification-request`.
 *
 * The form is forwarded as multipart because of the optional licence file; the
 * API validates the fields and the file, and its error message is shown in the
 * page. A successful submit reloads the page, which shows the pending state.
 */
export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const values = readValues(form);
		const problem = findProblem(values);

		if (problem) {
			return fail(400, { message: problem, values });
		}

		const response = await event.fetch('/api/v1/me/verification-request', {
			method: 'POST',
			body: form
		});

		if (!response.ok) {
			return fail(response.status, {
				message: await readErrorMessage(response),
				values
			});
		}

		redirect(303, '/me/verification?submitted=1');
	}
};

function readValues(form: FormData): RequestFormValues {
	return {
		orgName: readText(form.get('orgName')),
		contactInfo: readText(form.get('contactInfo')),
		websiteUrl: readText(form.get('websiteUrl'))
	};
}

function readText(value: FormDataEntryValue | null): string {
	return typeof value === 'string' ? value.trim() : '';
}

/** Returns the first form problem, or null when the values can be sent. */
function findProblem(values: RequestFormValues): string | null {
	if (values.orgName === '') {
		return 'Add the organisation name.';
	}

	if (values.orgName.length > 200) {
		return 'The organisation name must be 200 characters or fewer.';
	}

	if (values.contactInfo === '') {
		return 'Add a contact the admin can reach.';
	}

	if (values.contactInfo.length > 300) {
		return 'The contact must be 300 characters or fewer.';
	}

	if (values.websiteUrl.length > 500) {
		return 'The website address must be 500 characters or fewer.';
	}

	if (values.websiteUrl !== '' && !isHttpUrl(values.websiteUrl)) {
		return 'Enter the full website address, starting with http:// or https://.';
	}

	return null;
}

/** Accepts only full HTTP(S) addresses, so the admin can open the link. */
function isHttpUrl(value: string): boolean {
	if (!URL.canParse(value)) {
		return false;
	}

	const protocol = new URL(value).protocol;

	return protocol === 'http:' || protocol === 'https:';
}
