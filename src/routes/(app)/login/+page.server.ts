import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { auth } from '#lib/server/auth.ts';
import { readAuthMessage } from '#lib/server/auth-errors.ts';
import { db } from '#lib/server/db/index.ts';
import { sessions } from '#lib/server/db/auth.schema.ts';
import type { Actions, PageServerLoad } from './$types';

/**
 * Sign in (`/login`).
 *
 * The action calls Better Auth on the server; the `sveltekitCookies` plugin
 * writes the session cookie, so the form works without JavaScript. Failures are
 * returned as form data and rendered inline.
 */
export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) {
		redirect(303, '/me');
	}

	return {
		registered: url.searchParams.get('registered') === '1',
		reset: url.searchParams.get('reset') === '1'
	};
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const email = readText(form.get('email'));
		const password = readText(form.get('password'));

		if (!email || !password) {
			return fail(400, { email, message: 'Enter your email address and password.' });
		}

		try {
			const result = await auth.api.signInEmail({
				body: { email, password },
				headers: event.request.headers
			});

			// Better Auth checks the password, not the account lifecycle. A locked,
			// suspended or deleted account must not get a usable session, and the
			// status is only inspected after the credentials are proven, so this
			// does not reveal whether the address exists.
			if (result.user.status !== 'ACTIVE') {
				await db.delete(sessions).where(eq(sessions.token, result.token));

				return fail(403, {
					email,
					message: 'This account cannot sign in. Contact an administrator.'
				});
			}
		} catch (error) {
			return fail(400, { email, message: readAuthMessage(error) });
		}

		redirect(303, '/me');
	}
};

function readText(value: FormDataEntryValue | null): string {
	return typeof value === 'string' ? value.trim() : '';
}
