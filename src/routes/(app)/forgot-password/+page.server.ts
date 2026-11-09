import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { auth } from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

/**
 * Forgot password (`/forgot-password`).
 *
 * The page always answers the same way, whether or not the address exists,
 * so it cannot be used to enumerate accounts. Better Auth creates the token
 * and the email callback sends the link.
 */
export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) {
		redirect(303, '/me');
	}

	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const email = readText(form.get('email'));

		if (!z.email().safeParse(email).success) {
			return fail(400, { email, message: 'Enter a valid email address.' });
		}

		try {
			await auth.api.requestPasswordReset({
				body: { email },
				headers: event.request.headers
			});
		} catch (error) {
			// Keep the response generic even if the provider or rate limiter
			// fails; the operator gets the detail in the server log.
			console.error('Password reset request failed', error);
		}

		return { email, sent: true };
	}
};

function readText(value: FormDataEntryValue | null): string {
	return typeof value === 'string' ? value.trim() : '';
}
