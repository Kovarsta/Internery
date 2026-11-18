import { error, redirect } from '@sveltejs/kit';
import { apiGet } from '#lib/api/client.ts';
import type { AiSuggestions, StudentProfile } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

/**
 * Loads `/for-you`, the student suggestion list.
 *
 * Suggestions read the profile, not the CV, so this page needs no AI consent.
 * Signed-out visitors are sent to sign-in; another role gets a `403` instead of
 * a redirect, the same way `/employer` and `/admin` behave.
 */
export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		redirect(303, '/login');
	}

	if (event.locals.user.role !== 'STUDENT') {
		error(403, 'Suggested jobs are for student accounts.');
	}

	// Check the major first, so a student who has not filled it in sees a
	// prompt instead of the API's `422 PROFILE_INCOMPLETE` becoming a `502`.
	const profile = await apiGet<StudentProfile>(event, '/api/v1/me/student-profile');

	if (profile.major.trim() === '') {
		return { suggestions: null, needsMajor: true };
	}

	const suggestions = await apiGet<AiSuggestions>(event, '/api/v1/me/ai/suggestions');

	return { suggestions, needsMajor: false };
};
