import type { Handle } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { auth } from '#lib/server/auth.ts';
import { createErrorResponse } from '#lib/server/api/errors.ts';
import { checkRateLimit } from '#lib/server/rate-limit/index.ts';
import { svelteKitHandler } from 'better-auth/svelte-kit';

/**
 * Server hook for every request that reaches SvelteKit.
 *
 * SvelteKit calls `handle` once per page load, form action and API request.
 * Static files are served before this hook, so they do not pass through it.
 *
 * The chain does three jobs:
 *
 * 1. Caps `/api/v1` at a requests-per-second rate per client address. Auth
 *    endpoints are excluded on purpose: Better Auth has its own limiter, and AI
 *    calls have a separate daily budget.
 * 2. Reads the Better Auth session and puts it on `event.locals`. Loads,
 *    actions and API handlers then use `locals.user` without their own lookup.
 * 3. Hands the request to `svelteKitHandler`, which answers `/api/auth/*`
 *    itself and passes every other URL to `resolve`.
 */

/**
 * Applies the Redis rate limiter to the JSON API.
 *
 * Only real client calls to `/api/v1` are counted. A same-origin `fetch` from a
 * page load is a subrequest: it has no client address and it is not a separate
 * request the browser sent, so counting it would both fail and inflate the
 * bucket. Limiting page loads or static assets would punish a normal browser
 * for fetching a page. The limiter fails open: a Redis outage allows the
 * request instead of taking the API down with it.
 */
const handleRateLimit: Handle = async ({ event, resolve }) => {
	if (building || event.isSubRequest || !event.url.pathname.startsWith('/api/v1')) {
		return resolve(event);
	}

	let identifier: string;

	try {
		identifier = event.getClientAddress();
	} catch (error) {
		// A missing `ADDRESS_HEADER` is a deployment mistake. Do not turn it into
		// a 500 for every API call; log it and serve the request.
		console.error('[rate-limit] Cannot read the client address.', error);

		return resolve(event);
	}

	const decision = await checkRateLimit(identifier);

	if (decision === null) {
		return resolve(event);
	}

	if (!decision.allowed) {
		const response = createErrorResponse(
			'RATE_LIMITED',
			'Too many requests. Try again shortly.',
			undefined,
			crypto.randomUUID()
		);

		response.headers.set('retry-after', String(decision.retryAfterSeconds));
		response.headers.set('ratelimit-limit', String(decision.limit));
		response.headers.set('ratelimit-remaining', '0');

		return response;
	}

	const response = await resolve(event);

	response.headers.set('ratelimit-limit', String(decision.limit));
	response.headers.set('ratelimit-remaining', String(decision.remaining));

	return response;
};

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

export const handle: Handle = sequence(handleRateLimit, handleBetterAuth);
