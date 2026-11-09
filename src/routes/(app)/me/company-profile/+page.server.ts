import { fail, redirect } from '@sveltejs/kit';
import { apiGet } from '#lib/api/client.ts';
import { readErrorMessage } from '#lib/api/error-message.ts';
import {
	findAccountProblem,
	readAccountValues,
	saveAccountDetails
} from '#lib/server/account-details.ts';
import type { EmployerProfile, OrgType, UserMe } from '#lib/api/types.ts';
import type { Actions, PageServerLoad } from './$types';

type ProfileFormValues = {
	orgName: string;
	orgType: OrgType;
	description: string;
	address: string;
	contactPhone: string;
};

/**
 * Loads `/me/company-profile`.
 *
 * The company form is filled from `GET /me/employer-profile` and the personal
 * details form from `GET /me`. `saved` and `accountSaved` are the flags left by
 * each form's redirect, so the page can confirm the save once.
 */
export const load: PageServerLoad = async (event) => {
	const [profile, me] = await Promise.all([
		apiGet<EmployerProfile>(event, '/api/v1/me/employer-profile'),
		apiGet<UserMe>(event, '/api/v1/me')
	]);

	return {
		profile,
		me,
		saved: event.url.searchParams.get('saved') === '1',
		accountSaved: event.url.searchParams.get('accountSaved') === '1',
		onboarded: event.url.searchParams.get('onboarded') === '1'
	};
};

/**
 * Saves the employer profile through `PUT /me/employer-profile`.
 *
 * Verification state and ratings belong to other flows and are preserved. The API still owns the
 * length limits; the checks here only cover what the person can fix on the form.
 */
export const actions: Actions = {
	account: async (event) => {
		const form = await event.request.formData();
		const values = readAccountValues(form);
		const problem = findAccountProblem(values);

		if (problem) {
			return fail(400, { scope: 'account' as const, message: problem, values });
		}

		const failure = await saveAccountDetails(event, values);

		if (failure) {
			return failure;
		}

		redirect(303, '/me/company-profile?accountSaved=1');
	},
	company: async (event) => {
		const form = await event.request.formData();
		const values = readValues(form);
		const problem = findProblem(values);

		if (problem) {
			return fail(400, { scope: 'company' as const, message: problem, values });
		}

		const response = await event.fetch('/api/v1/me/employer-profile', {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(toPayload(values))
		});

		if (!response.ok) {
			return fail(response.status, {
				scope: 'company' as const,
				message: await readErrorMessage(response),
				values
			});
		}

		redirect(303, '/me/company-profile?saved=1');
	}
};

function readValues(form: FormData): ProfileFormValues {
	return {
		orgName: readText(form.get('orgName')),
		orgType: readOrgType(form.get('orgType')),
		description: readText(form.get('description')),
		address: readText(form.get('address')),
		contactPhone: readText(form.get('contactPhone'))
	};
}

function readText(value: FormDataEntryValue | null): string {
	return typeof value === 'string' ? value.trim() : '';
}

function readOrgType(value: FormDataEntryValue | null): OrgType {
	if (value === 'COMPANY' || value === 'INDIVIDUAL') {
		return value;
	}

	return 'INDIVIDUAL';
}

/** Returns the first form problem, or null when the values can be sent. */
function findProblem(values: ProfileFormValues): string | null {
	if (values.orgName === '') {
		return 'Add the organisation name.';
	}

	if (values.orgName.length > 200) {
		return 'The organisation name must be 200 characters or fewer.';
	}

	if (values.description.length > 2000) {
		return 'About must be 2000 characters or fewer.';
	}

	if (values.address.length > 300) {
		return 'The address must be 300 characters or fewer.';
	}

	if (values.contactPhone.length > 20) {
		return 'The contact phone must be 20 characters or fewer.';
	}

	return null;
}

function toPayload(values: ProfileFormValues) {
	return {
		orgName: values.orgName,
		orgType: values.orgType,
		description: values.description === '' ? null : values.description,
		address: values.address === '' ? null : values.address,
		contactPhone: values.contactPhone === '' ? null : values.contactPhone
	};
}
