import { error, fail, redirect } from '@sveltejs/kit';
import { apiGet } from '#lib/api/client.ts';
import {
	findAccountProblem,
	readAccountValues,
	saveAccountDetails
} from '#lib/server/account-details.ts';
import type { UserMe } from '#lib/api/types.ts';
import type { Actions, PageServerLoad } from './$types';

/**
 * Admin personal details (`/me/admin-profile`).
 *
 * Admins have no role-specific profile tab, so this page gives them the same
 * name and phone form the student and company profile pages use.
 */
export const load: PageServerLoad = async (event) => {
	if (event.locals.user?.role !== 'ADMIN') {
		error(403, 'Only administrators can open this page.');
	}

	const me = await apiGet<UserMe>(event, '/api/v1/me');

	return {
		me,
		accountSaved: event.url.searchParams.get('accountSaved') === '1'
	};
};

export const actions: Actions = {
	account: async (event) => {
		if (event.locals.user?.role !== 'ADMIN') {
			error(403, 'Only administrators can open this page.');
		}

		const form = await event.request.formData();
		const values = readAccountValues(form);
		const problem = findAccountProblem(values);

		if (problem) {
			return fail(400, { message: problem, values });
		}

		const failure = await saveAccountDetails(event, values);

		if (failure) {
			return failure;
		}

		redirect(303, '/me/admin-profile?accountSaved=1');
	}
};
