import { redirect } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.ts';
import { getOnboardedAt } from '#lib/server/services/users.ts';
import type { LayoutServerLoad } from './$types';

/**
 * Session data for the root layout.
 *
 * Only `id`, `name` and `role` are exposed: the header needs a display name and a dashboard link
 * for the role. Pages fetch everything else through their own load functions or the API.
 *
 * A signed-in OAuth account starts with `onboardedAt = null` and is held at
 * `/onboarding` until it chooses a role. The onboarding page itself skips the
 * redirect so it can render the picker.
 */
export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		return { user: null };
	}

	const onboardedAt = await getOnboardedAt(db, locals.user.id);

	if (!onboardedAt && url.pathname !== '/onboarding') {
		redirect(303, '/onboarding');
	}

	return {
		user: {
			id: locals.user.id,
			name: locals.user.name,
			role: locals.user.role
		}
	};
};
