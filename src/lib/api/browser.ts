import { readErrorMessage } from '#lib/api/error-message.ts';

export type ApiResult<T> =
	{ ok: true; data: T | null } | { ok: false; status: number; message: string };

/**
 * Calls a JSON write endpoint from the browser.
 *
 * Returns the error envelope instead of throwing, so the caller can show a
 * toast and stay on the page. `204` responses carry no body and yield `null`.
 */
export async function apiSend<T>(
	path: string,
	method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
	body?: unknown
): Promise<ApiResult<T>> {
	const response = await fetch(path, {
		method,
		headers: body === undefined ? undefined : { 'content-type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body)
	});

	return readResult<T>(response);
}

/**
 * Calls a multipart write endpoint from the browser.
 *
 * `FormData` must set its own boundary, so this helper never sends a
 * `content-type` header. Used by the avatar, CV and verification uploads.
 */
export async function apiUpload<T>(
	path: string,
	method: 'POST' | 'PUT',
	body: FormData
): Promise<ApiResult<T>> {
	const response = await fetch(path, { method, body });

	return readResult<T>(response);
}

/** Maps an API response to the shared result shape. */
async function readResult<T>(response: Response): Promise<ApiResult<T>> {
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
