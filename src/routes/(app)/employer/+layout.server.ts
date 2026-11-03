import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/**
 * Guard for every `/employer` page.
 *
 * Only employer accounts may post jobs or read applicants. Signed-out visitors are sent to the
 * sign-in page; another role gets a `403` rather than a redirect, so the page does not pretend
 * the area exists for them.
 */
export const load: LayoutServerLoad = ({ locals }) => {
	if (!locals.user) {
		redirect(303, '/login');
	}

	if (locals.user.role !== 'EMPLOYER') {
		error(403, 'This area is for employer accounts.');
	}

	return {};
};
