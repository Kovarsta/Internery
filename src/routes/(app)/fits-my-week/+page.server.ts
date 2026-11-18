import { error } from '@sveltejs/kit';
import { apiGet } from '#lib/api/client.ts';
import type { JobSummary, Paged, StudentProfile } from '#lib/api/types.ts';
import { toJobSearchQuery } from '#lib/job-search.ts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 8;

/**
 * Loads `/fits-my-week`: open jobs whose whole shift fits the student's saved
 * free time.
 *
 * The matching is the normal job query with `scheduleFit=true`, which asks the
 * database for containment rather than overlap. No AI is involved, and the
 * result is exact: every returned job can be worked inside the saved days and
 * blocks.
 *
 * @throws 403 when the account is not a student, matching the other role areas.
 */
export const load: PageServerLoad = async (event) => {
	if (event.locals.user?.role !== 'STUDENT') {
		error(403, 'Availability matching is for student accounts.');
	}

	const profile = await apiGet<StudentProfile>(event, '/api/v1/me/student-profile');
	const days = profile.availableDays;
	const timeOfDay = profile.availableTimeOfDay;

	// Nothing saved yet: the page explains what to fill in instead of running
	// an unfiltered search, which would look like a broken filter.
	if (days.length === 0 && timeOfDay.length === 0) {
		return { needsAvailability: true as const, availability: null, jobs: null };
	}

	const page = readPage(event.url.searchParams.get('page'));
	const query = toJobSearchQuery({
		daysOfWeek: days,
		timeOfDay,
		scheduleFit: true,
		sort: 'newest',
		verifiedOnly: false
	});
	query.set('page', String(page));
	query.set('pageSize', String(PAGE_SIZE));

	const jobs = await apiGet<Paged<JobSummary>>(event, `/api/v1/jobs?${query}`);

	const paginationQuery = new URLSearchParams(query);
	paginationQuery.delete('page');

	return {
		needsAvailability: false as const,
		availability: { days, timeOfDay },
		jobs,
		page,
		pageSize: PAGE_SIZE,
		paginationQuery: paginationQuery.toString()
	};
};

function readPage(value: string | null): number {
	const page = Number(value);

	return Number.isInteger(page) && page > 0 ? page : 1;
}
