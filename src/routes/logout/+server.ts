import { redirect } from '@sveltejs/kit';
import { auth } from '#lib/server/auth.ts';
import type { RequestHandler } from './$types';

/**
 * Signs the current session out (`POST /logout`).
 *
 * A POST rather than a GET link: signing out changes server state, so a
 * crawler or a link prefetch must not trigger it. Better Auth clears the
 * session cookie through the SvelteKit cookie plugin, then the browser returns
 * to the home page.
 */
export const POST: RequestHandler = async (event) => {
	await auth.api.signOut({ headers: event.request.headers });

	redirect(303, '/');
};
