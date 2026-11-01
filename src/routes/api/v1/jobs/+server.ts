import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toJobDetail, toJobSummary } from '#lib/server/api/mappers.ts';
import { paged, parsePagination } from '#lib/server/api/pagination.ts';
import { parseJson, parseQuery } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { createJob, searchOpenJobs } from '#lib/server/services/jobs.ts';

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

/** Job fields enforced by the contract; `endDate` must be strictly after `startDate`. */
const createJobSchema = z
	.object({
		title: z.string().trim().min(1).max(200),
		categoryId: z.uuid(),
		description: z.string().trim().min(1),
		location: z.string().trim().min(1).max(300),
		schedule: z.string().trim().min(1),
		salaryAmount: z.number().int().positive(),
		salaryType: z.enum(['HOURLY', 'DAILY', 'FIXED']),
		startDate: z.iso.date(),
		endDate: z.iso.date(),
		positionsNeeded: z.number().int().min(1)
	})
	.refine((job) => job.endDate > job.startDate, {
		path: ['endDate'],
		message: 'endDate must be after startDate.'
	});

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
export const POST: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['EMPLOYER']);
		const body = await parseJson(event.request, createJobSchema);
		const job = await createJob(db, user.id, body);

		return Response.json(toJobDetail(job, null), { status: 201 });
	} catch (error) {
		return handleApiError(error);
	}
};
