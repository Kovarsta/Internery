import type { RequestHandler } from './$types';
import { z } from 'zod';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toJobSummary } from '#lib/server/api/mappers.ts';
import { notImplemented } from '#lib/server/api/not-implemented.ts';
import { paged, parsePagination } from '#lib/server/api/pagination.ts';
import { parseQuery } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { searchOpenJobs } from '#lib/server/services/jobs.ts';

/** Treats an empty query value as absent before coercing to an integer. */
const optionalAmount = z.preprocess(
	(value) => (value === '' ? undefined : value),
	z.coerce.number().int().min(0).optional()
);

const querySchema = z
	.object({
		q: z
			.string()
			.trim()
			.max(100)
			.optional()
			.transform((value) => (value ? value : undefined)),
		categoryId: z.uuid().optional(),
		location: z
			.string()
			.trim()
			.max(100)
			.optional()
			.transform((value) => (value ? value : undefined)),
		salaryMin: optionalAmount,
		salaryMax: optionalAmount,
		startFrom: z.iso.date().optional(),
		endTo: z.iso.date().optional(),
		verifiedOnly: z.enum(['true', 'false']).default('false'),
		sort: z.enum(['newest', 'salary_desc']).default('newest')
	})
	.refine(
		(query) =>
			query.salaryMin === undefined ||
			query.salaryMax === undefined ||
			query.salaryMin <= query.salaryMax,
		{ path: ['salaryMax'], message: 'salaryMax must be at least salaryMin.' }
	)
	.refine(
		(query) =>
			query.startFrom === undefined || query.endTo === undefined || query.startFrom <= query.endTo,
		{ path: ['endTo'], message: 'endTo must be on or after startFrom.' }
	);

/** GET /jobs — searchJobs */
export const GET: RequestHandler = async (event) => {
	try {
		const query = parseQuery(event.url, querySchema);
		const pagination = parsePagination(event.url);

		const { items, total } = await searchOpenJobs(db, {
			query: query.q,
			categoryId: query.categoryId,
			location: query.location,
			salaryMin: query.salaryMin,
			salaryMax: query.salaryMax,
			startFrom: query.startFrom,
			endTo: query.endTo,
			verifiedOnly: query.verifiedOnly === 'true',
			sort: query.sort,
			limit: pagination.pageSize,
			offset: pagination.offset
		});

		return Response.json(paged(items.map(toJobSummary), total, pagination));
	} catch (error) {
		return handleApiError(error);
	}
};

/** POST /jobs — createJob */
export const POST: RequestHandler = () => notImplemented();
