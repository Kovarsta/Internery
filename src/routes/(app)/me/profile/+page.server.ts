import { fail, redirect } from '@sveltejs/kit';
import { apiGet } from '#lib/api/client.ts';
import { readErrorMessage } from '#lib/api/error-message.ts';
import {
	findAccountProblem,
	readAccountValues,
	saveAccountDetails
} from '#lib/server/account-details.ts';
import {
	TIME_OF_DAY_VALUES,
	isDayOfWeek,
	isTimeOfDay,
	sortDaysOfWeek,
	type DayOfWeek,
	type TimeOfDay
} from '#lib/schedule.ts';
import type { StudentProfile, UserMe } from '#lib/api/types.ts';
import type { Actions, PageServerLoad } from './$types';

type ProfileFormValues = {
	university: string;
	major: string;
	skills: string;
	bio: string;
};

type AvailabilityFormValues = {
	days: DayOfWeek[];
	timeOfDay: TimeOfDay[];
	notes: string;
	digestEnabled: boolean;
};

/**
 * Loads `/me/profile`.
 *
 * The student form is filled from `GET /me/student-profile` and the personal
 * details form from `GET /me`. `saved`, `accountSaved` and `availabilitySaved`
 * are the flags left by each form's redirect, so the page can confirm the save
 * once.
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
		accountSaved: event.url.searchParams.get('accountSaved') === '1',
		availabilitySaved: event.url.searchParams.get('availabilitySaved') === '1',
		onboarded: event.url.searchParams.get('onboarded') === '1'
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

	/**
	 * Saves free time and the email preference.
	 *
	 * The endpoint replaces the whole student profile, so the action reads the
	 * current row first and sends it back with the availability fields changed.
	 * The student form omits these fields, which is why it cannot overwrite them.
	 */
	availability: async (event) => {
		const form = await event.request.formData();
		const values = readAvailabilityValues(form);
		const problem = findAvailabilityProblem(values);

		if (problem) {
			return fail(400, { scope: 'availability' as const, message: problem, values });
		}

		const profile = await apiGet<StudentProfile>(event, '/api/v1/me/student-profile');

		if (profile.university === '' || profile.major === '') {
			return fail(400, {
				scope: 'availability' as const,
				message: 'Add your university and major in Student details first.',
				values
			});
		}

		const response = await event.fetch('/api/v1/me/student-profile', {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				university: profile.university,
				major: profile.major,
				skills: profile.skills,
				availability: values.notes === '' ? null : values.notes,
				availableDays: values.days,
				availableTimeOfDay: values.timeOfDay,
				digestEnabled: values.digestEnabled,
				bio: profile.bio
			})
		});

		if (!response.ok) {
			return fail(response.status, {
				scope: 'availability' as const,
				message: await readErrorMessage(response),
				values
			});
		}

		redirect(303, '/me/profile?availabilitySaved=1');
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
		bio: readText(form.get('bio'))
	};
}

function readAvailabilityValues(form: FormData): AvailabilityFormValues {
	return {
		days: readSelectedValues(form.getAll('availableDay'), isDayOfWeek, sortDaysOfWeek),
		timeOfDay: readSelectedValues(form.getAll('availableTimeOfDay'), isTimeOfDay, (slots) =>
			TIME_OF_DAY_VALUES.filter((slot) => slots.includes(slot))
		),
		notes: readText(form.get('availability')),
		digestEnabled: form.get('digestEnabled') === 'true'
	};
}

/**
 * Reads repeated checkbox values, keeping only known ones in canonical order.
 *
 * The form submits `availableDay=MONDAY&availableDay=SUNDAY`; an unknown value
 * would otherwise reach the API and fail validation, so it is dropped here.
 */
function readSelectedValues<T extends string>(
	values: FormDataEntryValue[],
	isKnown: (value: string) => value is T,
	sort: (values: T[]) => T[]
): T[] {
	const selected = values.filter((value): value is string => typeof value === 'string');
	const known = selected.filter(isKnown);

	return sort(known.filter((value, index) => known.indexOf(value) === index));
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

	if (values.bio.length > 2000) {
		return 'About you must be 2000 characters or fewer.';
	}

	return null;
}

/** Availability has its own form, so it has its own small check. */
function findAvailabilityProblem(values: AvailabilityFormValues): string | null {
	if (values.notes.length > 500) {
		return 'The schedule note must be 500 characters or fewer.';
	}

	return null;
}

function toPayload(values: ProfileFormValues) {
	return {
		university: values.university,
		major: values.major,
		skills: splitSkills(values.skills),
		bio: values.bio === '' ? null : values.bio
	};
}
