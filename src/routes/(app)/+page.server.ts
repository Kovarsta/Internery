import { apiGet } from '#lib/api/client.ts';
import type { Category, JobSummary, Paged } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

const LATEST_JOB_COUNT = 4;

/**
 * Loads `/`.
 *
 * The home page is public, so it reads the same public endpoints as `/jobs`: the newest open
 * shifts and the active categories. The signed-in user comes from the root layout.
 */
export const load: PageServerLoad = async (event) => {
	const query = new URLSearchParams({
		page: '1',
		pageSize: String(LATEST_JOB_COUNT),
		sort: 'newest'
	});

	const [latestJobs, categories] = await Promise.all([
		apiGet<Paged<JobSummary>>(event, `/api/v1/jobs?${query}`),
		apiGet<Category[]>(event, '/api/v1/categories')
	]);

	return { latestJobs, categories };
};
