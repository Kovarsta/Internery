import { fail, redirect } from '@sveltejs/kit';
import { apiGet } from '#lib/api/client.ts';
import { readErrorMessage } from '#lib/api/error-message.ts';
import {
	findAccountProblem,
	readAccountValues,
	saveAccountDetails
} from '#lib/server/account-details.ts';
import type { StudentProfile, UserMe } from '#lib/api/types.ts';
import type { Actions, PageServerLoad } from './$types';

type ProfileFormValues = {
	university: string;
	major: string;
	skills: string;
	availability: string;
	bio: string;
};

/**
 * Loads `/me/profile`.
 *
 * The student form is filled from `GET /me/student-profile` and the personal
 * details form from `GET /me`. `saved` and `accountSaved` are the flags left by
 * each form's redirect, so the page can confirm the save once.
 */
export const load: PageServerLoad = async (event) => {
	const [profile, me] = await Promise.all([
		apiGet<StudentProfile>(event, '/api/v1/me/student-profile'),
		apiGet<UserMe>(event, '/api/v1/me')
	]);

	return {
		profile,
		me,
		saved: event.url.searchParams.get('saved') === '1',
		accountSaved: event.url.searchParams.get('accountSaved') === '1'
	};
};

/**
 * Saves the profile through `PUT /me/student-profile`.
 *
 * The checks here only cover what the person can fix on the form. The API still validates every
 * field and owns the length limits. A rejected payload comes back with the values still filled in.
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

		redirect(303, '/me/profile?accountSaved=1');
	},
	profile: async (event) => {
		const form = await event.request.formData();
		const values = readValues(form);
		const problem = findProblem(values);

		if (problem) {
			return fail(400, { scope: 'profile' as const, message: problem, values });
		}

		const response = await event.fetch('/api/v1/me/student-profile', {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(toPayload(values))
		});

		if (!response.ok) {
			return fail(response.status, {
				scope: 'profile' as const,
				message: await readErrorMessage(response),
				values
			});
		}

		redirect(303, '/me/profile?saved=1');
	}
};

function readValues(form: FormData): ProfileFormValues {
	return {
		university: readText(form.get('university')),
		major: readText(form.get('major')),
		skills: readText(form.get('skills')),
		availability: readText(form.get('availability')),
		bio: readText(form.get('bio'))
	};
}

function readText(value: FormDataEntryValue | null): string {
	return typeof value === 'string' ? value.trim() : '';
}

/** Splits the comma-separated field into the list the API expects. */
function splitSkills(value: string): string[] {
	return value
		.split(',')
		.map((skill) => skill.trim())
		.filter((skill) => skill !== '');
}

/** Returns the first form problem, or null when the values can be sent. */
function findProblem(values: ProfileFormValues): string | null {
	if (values.university === '' || values.major === '') {
		return 'Add your university and major.';
	}

	if (values.university.length > 160 || values.major.length > 160) {
		return 'University and major must be 160 characters or fewer.';
	}

	const skills = splitSkills(values.skills);

	if (skills.length > 30) {
		return 'List at most 30 skills.';
	}

	if (skills.some((skill) => skill.length > 50)) {
		return 'Each skill must be 50 characters or fewer.';
	}

	if (values.availability.length > 500) {
		return 'Availability must be 500 characters or fewer.';
	}

	if (values.bio.length > 2000) {
		return 'About you must be 2000 characters or fewer.';
	}

	return null;
}

function toPayload(values: ProfileFormValues) {
	return {
		university: values.university,
		major: values.major,
		skills: splitSkills(values.skills),
		availability: values.availability === '' ? null : values.availability,
		bio: values.bio === '' ? null : values.bio
	};
}
