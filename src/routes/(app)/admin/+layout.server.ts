import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/**
 * Guard for every `/admin` page.
 *
 * Admin pages expose moderation data, so a signed-in account with another role gets a `403`
 * instead of a redirect. The API checks the role again; this guard only keeps the UI honest.
 */
export const load: LayoutServerLoad = ({ locals }) => {
	if (!locals.user) {
		redirect(303, '/login');
	}

	if (locals.user.role !== 'ADMIN') {
		error(403, 'This area is for administrators.');
	}

	return {};
};
