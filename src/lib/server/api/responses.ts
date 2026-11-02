/**
 * Returns a JSON response that browsers and proxies must not store.
 *
 * Use it for personalised data. A cached copy can outlive the session, point at
 * a stale resource, or be served to another user by a shared cache. Public,
 * immutable data belongs in the normal `Response.json` path instead.
 */
export function noStoreJson(body: unknown, init?: ResponseInit): Response {
	const headers = new Headers(init?.headers);
	headers.set('Cache-Control', 'no-store');

	return Response.json(body, { ...init, headers });
}
