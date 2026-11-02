import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/**
 * Guard for every `/me` page.
 *
 * Account pages need a session; the role is not restricted because students, employers and
 * admins all have an account hub. Signed-out visitors go to the sign-in page.
 */
export const load: LayoutServerLoad = ({ locals }) => {
	if (!locals.user) {
		redirect(303, '/login');
	}

	return {};
};
