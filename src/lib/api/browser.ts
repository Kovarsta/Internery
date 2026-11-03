import { readErrorMessage } from '#lib/api/error-message.ts';

export type ApiResult<T> =
	{ ok: true; data: T | null } | { ok: false; status: number; message: string };

/**
 * Calls a write endpoint from the browser.
 *
 * Returns the error envelope instead of throwing, so the caller can show a
 * toast and stay on the page. `204` responses carry no body and yield `null`.
 */
export async function apiSend<T>(
	path: string,
	method: 'POST' | 'PUT' | 'DELETE',
	body?: unknown
): Promise<ApiResult<T>> {
	const response = await fetch(path, {
		method,
		headers: body === undefined ? undefined : { 'content-type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body)
	});

	if (!response.ok) {
		return {
			ok: false,
			status: response.status,
			message: await readErrorMessage(response)
		};
	}

	if (response.status === 204) {
		return { ok: true, data: null };
	}

	return { ok: true, data: (await response.json()) as T };
}
