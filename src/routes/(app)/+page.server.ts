import { apiGet } from '#lib/api/client.ts';
import type { Category, JobSummary, Paged } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

const FEATURED_JOB_COUNT = 4;
// Fetch a buffer so the page can drop any job that already appears in the
// featured sections and still fill the fresh-shift list.
const LATEST_JOB_COUNT = 8;

/**
 * Loads `/`.
 *
 * The home page is public, so it reads the same public endpoints as `/jobs`.
 * Featured jobs use the computed hot ranking, not a stored flag, so the page
 * keeps moving without an admin curation step.
 */
export const load: PageServerLoad = async (event) => {
	const featuredQuery = new URLSearchParams({
		page: '1',
		pageSize: String(FEATURED_JOB_COUNT),
		sort: 'featured'
	});
	const latestQuery = new URLSearchParams({
		page: '1',
		pageSize: String(LATEST_JOB_COUNT),
		sort: 'newest'
	});

	const [featuredJobs, latestJobs, categories] = await Promise.all([
		apiGet<Paged<JobSummary>>(event, `/api/v1/jobs?${featuredQuery}`),
		apiGet<Paged<JobSummary>>(event, `/api/v1/jobs?${latestQuery}`),
		apiGet<Category[]>(event, '/api/v1/categories')
	]);

	return { featuredJobs, latestJobs, categories };
};
