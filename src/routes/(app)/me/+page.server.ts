import { fail, redirect } from '@sveltejs/kit';
import { apiGet } from '#lib/api/client.ts';
import { readErrorMessage } from '#lib/api/error-message.ts';
import type { UserMe } from '#lib/api/types.ts';
import type { Actions, PageServerLoad } from './$types';

type AccountFormValues = {
	fullName: string;
	phone: string;
};

/**
 * Loads the account summary from `GET /me`.
 *
 * `saved` is the flag left by the account-details form's redirect, so the page
 * can confirm the save once.
 */
export const load: PageServerLoad = async (event) => {
	const me = await apiGet<UserMe>(event, '/api/v1/me');

	return {
		me,
		saved: event.url.searchParams.get('saved') === '1'
	};
};

/**
 * Saves the account name and phone through `PATCH /me`.
 *
 * This form only owns general information. Email and password are credentials
 * with separate verification and stay out of it. The API still owns the length
 * limits; the checks here only cover what the person can fix on the form.
 */
export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const values = readValues(form);
		const problem = findProblem(values);

		if (problem) {
			return fail(400, { message: problem, values });
		}

		const response = await event.fetch('/api/v1/me', {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(toPayload(values))
		});

		if (!response.ok) {
			return fail(response.status, {
				message: await readErrorMessage(response),
				values
			});
		}

		redirect(303, '/me?saved=1');
	}
};

function readValues(form: FormData): AccountFormValues {
	return {
		fullName: readText(form.get('fullName')),
		phone: readText(form.get('phone'))
	};
}

function readText(value: FormDataEntryValue | null): string {
	return typeof value === 'string' ? value.trim() : '';
}

/** Returns the first form problem, or null when the values can be sent. */
function findProblem(values: AccountFormValues): string | null {
	if (values.fullName === '') {
		return 'Add your full name.';
	}

	if (values.fullName.length > 120) {
		return 'The full name must be 120 characters or fewer.';
	}

	if (values.phone.length > 20) {
		return 'The phone number must be 20 characters or fewer.';
	}

	return null;
}

function toPayload(values: AccountFormValues) {
	return {
		fullName: values.fullName,
		phone: values.phone === '' ? null : values.phone
	};
}
