import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** Availability matching moved into `/recommendations`. */
export const load: PageServerLoad = () => {
	redirect(308, '/recommendations?tab=matches');
};
