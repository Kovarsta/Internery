import { fail, type RequestEvent } from '@sveltejs/kit';
import { readErrorMessage } from '#lib/api/error-message.ts';

export type AccountFormValues = {
	fullName: string;
	phone: string;
};

/** Reads the general-information fields from a form submission. */
export function readAccountValues(form: FormData): AccountFormValues {
	return {
		fullName: readText(form.get('fullName')),
		phone: readText(form.get('phone'))
	};
}

/** Returns the first form problem, or null when the values can be sent. */
export function findAccountProblem(values: AccountFormValues): string | null {
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

/**
 * Saves the account name and phone through `PATCH /me`.
 *
 * Returns the failure to hand back to the form, or null when the write
 * succeeded and the caller can redirect.
 */
export async function saveAccountDetails(event: RequestEvent, values: AccountFormValues) {
	const response = await event.fetch('/api/v1/me', {
		method: 'PATCH',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			fullName: values.fullName,
			phone: values.phone === '' ? null : values.phone
		})
	});

	if (!response.ok) {
		return fail(response.status, {
			scope: 'account' as const,
			message: await readErrorMessage(response),
			values
		});
	}

	return null;
}

function readText(value: FormDataEntryValue | null): string {
	return typeof value === 'string' ? value.trim() : '';
}
