import { error, redirect } from '@sveltejs/kit';
import { apiGet } from '#lib/api/client.ts';
import type { StudentProfile } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

/** Which tab the page opens on. */
export type RecommendationTab = 'matches' | 'ai';

/**
 * Loads `/recommendations`.
 *
 * Only the profile is read here; each tab fetches its own list in the browser so
 * the page renders immediately with a skeleton. The AI call can take up to 15
 * seconds, which must not hold up the whole page.
 *
 * `?tab=ai` and `?tab=matches` make a tab linkable; the old `/for-you` and
 * `/fits-my-week` routes redirect here.
 */
export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		redirect(303, '/login');
	}

	if (event.locals.user.role !== 'STUDENT') {
		error(403, 'Recommendations are for student accounts.');
	}

	const profile = await apiGet<StudentProfile>(event, '/api/v1/me/student-profile');
	const days = profile.availableDays;
	const timeOfDay = profile.availableTimeOfDay;
	const hasAvailability = days.length > 0 || timeOfDay.length > 0;

	const requestedTab = event.url.searchParams.get('tab');
	const initialTab: RecommendationTab =
		requestedTab === 'ai' || requestedTab === 'matches'
			? requestedTab
			: hasAvailability
				? 'matches'
				: 'ai';

	return {
		availability: { days, timeOfDay },
		hasAvailability,
		digestEnabled: profile.digestEnabled,
		initialTab
	};
};
