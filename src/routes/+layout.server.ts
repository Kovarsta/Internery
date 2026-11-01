import type { LayoutServerLoad } from './$types';

/** Exposes just enough of the session for the header; pages fetch the rest themselves. */
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
