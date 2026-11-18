import { fail, redirect } from '@sveltejs/kit';
import { apiGet } from '#lib/api/client.ts';
import { readErrorMessage } from '#lib/api/error-message.ts';
import type { AiConsent } from '#lib/api/types.ts';
import type { Actions, PageServerLoad } from './$types';

/**
 * Loads `/me/ai`.
 *
 * `apiGet` also enforces the STUDENT role: an employer who opens the URL
 * reaches the API's `403`, which becomes a SvelteKit `403` page.
 */
export const load: PageServerLoad = async (event) => {
	const consent = await apiGet<AiConsent>(event, '/api/v1/me/ai/consent');

	return {
		consent,
		updated: event.url.searchParams.get('updated') === '1'
	};
};

/**
 * Grants or withdraws consent through `PUT /me/ai/consent`.
 *
 * Both forms submit the same action with `granted=true` or `granted=false`.
 * Withdrawal also deletes the cached explanations inside the API, so the page
 * reloads after a successful write instead of patching local state.
 */
export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const granted = form.get('granted') === 'true';

		const response = await event.fetch('/api/v1/me/ai/consent', {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ granted })
		});

		if (!response.ok) {
			return fail(response.status, {
				message: await readErrorMessage(response)
			});
		}

		redirect(303, '/me/ai?updated=1');
	}
};
