import type { LayoutServerLoad } from './$types';

/**
 * Session data for the root layout.
 *
 * Only `id`, `name` and `role` are exposed: the header needs a display name and a dashboard link
 * for the role. Pages fetch everything else through their own load functions or the API.
 */
export const load: LayoutServerLoad = ({ locals }) => {
	if (!locals.user) {
		return { user: null };
	}

	return {
		user: {
			id: locals.user.id,
			name: locals.user.name,
			role: locals.user.role
		}
	};
};
