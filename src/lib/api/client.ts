import { error, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { readErrorMessage } from '#lib/api/error-message.ts';

/**
 * Calls a `GET /api/v1` endpoint from a server load.
 *
 * `event.fetch` keeps the request on the app origin and forwards the session cookie, so the API
 * enforces the same authentication and roles it would for any other client. The error envelope is
 * translated into the matching SvelteKit response.
 */
export async function apiGet<T>(event: RequestEvent, path: string): Promise<T> {
	const response = await event.fetch(path);

	if (!response.ok) {
		await failRequest(response);
	}

	return (await response.json()) as T;
}

/**
 * Calls a `GET /api/v1` endpoint that answers `404` when the resource is absent.
 *
 * Used for an optional "latest" row, where absence is a normal state instead of an error. Every
 * other status is handled exactly like `apiGet`.
 */
export async function apiGetOptional<T>(event: RequestEvent, path: string): Promise<T | null> {
	const response = await event.fetch(path);

	if (response.status === 404) {
		return null;
	}

	if (!response.ok) {
		await failRequest(response);
	}

	return (await response.json()) as T;
}

/** Turns an API error into a SvelteKit error or redirect. Always throws. */
async function failRequest(response: Response): Promise<never> {
	const message = await readErrorMessage(response);

	if (response.status === 401) {
		redirect(303, '/login');
	}

	if (response.status === 404) {
		error(404, message);
	}

	if (response.status === 403) {
		error(403, message);
	}

	error(502, message);
}
