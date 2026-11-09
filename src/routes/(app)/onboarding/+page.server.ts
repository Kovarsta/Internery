import { fail, redirect } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.ts';
import { completeOnboarding, getOnboardedAt } from '#lib/server/services/users.ts';
import type { Actions, PageServerLoad } from './$types';

type SignupRole = 'STUDENT' | 'EMPLOYER';

/**
 * OAuth onboarding (`/onboarding`).
 *
 * A GitHub account is created before it knows whether it belongs to a student
 * or an employer. This page fills that gap and marks `user_profiles.onboardedAt`
 * so the root layout no longer sends the account back here.
 */
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(303, '/login');
	}

	const onboardedAt = await getOnboardedAt(db, locals.user.id);

	if (onboardedAt) {
		redirect(303, '/me');
	}

	return {
		name: locals.user.name,
		email: locals.user.email
	};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		if (!locals.user) {
			redirect(303, '/login');
		}

		const form = await request.formData();
		const role = readRole(form.get('role'));

		if (!role) {
			return fail(400, { message: 'Choose how you will use Internery.' });
		}

		await completeOnboarding(db, locals.user.id, role);

		redirect(
			303,
			role === 'STUDENT' ? '/me/profile?onboarded=1' : '/me/company-profile?onboarded=1'
		);
	}
};

function readRole(value: FormDataEntryValue | null): SignupRole | null {
	if (value === 'STUDENT' || value === 'EMPLOYER') {
		return value;
	}

	return null;
}
