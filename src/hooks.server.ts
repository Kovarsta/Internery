import type { Handle } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { auth } from '#lib/server/auth.ts';
import { svelteKitHandler } from 'better-auth/svelte-kit';

/**
 * Server hook for every request that reaches SvelteKit.
 *
 * SvelteKit calls `handle` once per page load, form action and API request.
 * Static files are served before this hook, so they do not pass through it.
 *
 * The hook does two jobs:
 *
 * 1. Reads the Better Auth session and puts it on `event.locals`. Loads,
 *    actions and API handlers then use `locals.user` without their own lookup.
 * 2. Hands the request to `svelteKitHandler`, which answers `/api/auth/*`
 *    itself and passes every other URL to `resolve`.
 */
const handleBetterAuth: Handle = async ({ event, resolve }) => {
	// `auth` is the single instance created when `src/lib/server/auth.ts` loads.
	// Reading the session on every request is what makes `locals.user` available
	// to the rest of the server code.
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	// `svelteKitHandler` checks whether the URL starts with the auth base path.
	// If it does, Better Auth answers it; otherwise `resolve` runs the normal
	// SvelteKit route chain. During `vite build` there are no requests to
	// answer, so `building` makes the helper skip the auth branch.
	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
