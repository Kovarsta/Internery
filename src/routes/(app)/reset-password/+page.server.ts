import { fail, redirect } from '@sveltejs/kit';
import { isAPIError } from 'better-auth/api';
import { auth } from '#lib/server/auth.ts';
import { readAuthMessage } from '#lib/server/auth-errors.ts';
import type { Actions, PageServerLoad } from './$types';

/**
 * Reset password (`/reset-password?token=...`).
 *
 * The token comes from the email link and is consumed by Better Auth in one
 * transaction. A valid reset revokes the account's other sessions, so the
 * student signs in again with the new password.
 */
export const load: PageServerLoad = ({ url }) => {
	const token = url.searchParams.get('token');
	const error = url.searchParams.get('error');

	return {
		token,
		invalid: token === null || error === 'INVALID_TOKEN'
	};
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const token = readText(form.get('token'));
		const password = readText(form.get('password'));
		const confirmation = readText(form.get('confirmation'));

		if (token === '') {
			return fail(400, {
				token,
				invalid: true,
				message: 'This reset link is missing its token. Request a new one.'
			});
		}

		if (password.length < 8) {
			return fail(400, { token, invalid: false, message: 'Use at least 8 characters.' });
		}

		if (password !== confirmation) {
			return fail(400, { token, invalid: false, message: 'The passwords do not match.' });
		}

		try {
			await auth.api.resetPassword({
				body: { newPassword: password, token },
				headers: event.request.headers
			});
		} catch (error) {
			if (isAPIError(error) && error.body?.code === 'INVALID_TOKEN') {
				return fail(400, {
					token,
					invalid: true,
					message: 'This reset link is invalid or expired.'
				});
			}

			return fail(400, { token, invalid: false, message: readAuthMessage(error) });
		}

		redirect(303, '/login?reset=1');
	}
};

function readText(value: FormDataEntryValue | null): string {
	return typeof value === 'string' ? value.trim() : '';
}
