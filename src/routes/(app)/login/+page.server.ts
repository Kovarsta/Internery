import { fail, redirect } from '@sveltejs/kit';
import { ORIGIN } from '$app/env/private';
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
		reset: url.searchParams.get('reset') === '1',
		githubError: url.searchParams.has('error')
	};
};

export const actions: Actions = {
	credentials: async (event) => {
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
	},
	github: async (event) => {
		let authorizeUrl: string | undefined;

		try {
			const result = await auth.api.signInSocial({
				body: {
					provider: 'github',
					callbackURL: `${ORIGIN}/me`,
					newUserCallbackURL: `${ORIGIN}/onboarding`,
					errorCallbackURL: `${ORIGIN}/login?error=github`
				},
				headers: event.request.headers
			});

			authorizeUrl = result.url;
		} catch (error) {
			console.error('GitHub sign-in failed', error);
			return fail(500, { message: readAuthMessage(error) });
		}

		if (!authorizeUrl) {
			return fail(500, {
				message: 'GitHub sign-in is unavailable. Try your email and password instead.'
			});
		}

		// The redirect must stay outside the try/catch: SvelteKit uses a thrown
		// Redirect, and catching it would turn a normal redirect into an error.
		redirect(303, authorizeUrl, { external: true });
	}
};

function readText(value: FormDataEntryValue | null): string {
	return typeof value === 'string' ? value.trim() : '';
}
