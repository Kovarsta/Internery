import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** The AI suggestions moved into `/recommendations`. */
export const load: PageServerLoad = () => {
	redirect(308, '/recommendations?tab=ai');
};
