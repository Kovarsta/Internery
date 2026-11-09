import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { hasOrderedDates, hasOrderedTimes, jobFields } from '#lib/server/api/job-fields.ts';
import { toJobDetail, toJobSummary } from '#lib/server/api/mappers.ts';
import { paged, parsePagination } from '#lib/server/api/pagination.ts';
import { parseJson, parseQuery } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { createJob, searchOpenJobs } from '#lib/server/services/jobs.ts';
import { DAY_OF_WEEK_VALUES, TIME_OF_DAY_VALUES } from '#lib/schedule.ts';

/** Treats an empty query value as absent before coercing to an integer. */
const optionalAmount = z.preprocess(
	(value) => (value === '' ? undefined : value),
	z.coerce.number().int().min(0).optional()
);

/** Splits one comma-separated query value; a blank value means absent. */
function commaSeparated(value: unknown): string[] | undefined {
	if (typeof value !== 'string' || value.trim() === '') {
		return undefined;
	}

	return value
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry !== '');
}

const querySchema = z
	.object({
		q: z
			.string()
			.trim()
			.max(100)
			.optional()
			.transform((value) => (value ? value : undefined)),
		categoryId: z.uuid().optional(),
		locationId: z.uuid().optional(),
		dayOfWeek: z.preprocess(commaSeparated, z.array(z.enum(DAY_OF_WEEK_VALUES)).optional()),
		timeOfDay: z.preprocess(commaSeparated, z.array(z.enum(TIME_OF_DAY_VALUES)).optional()),
		salaryMin: optionalAmount,
		salaryMax: optionalAmount,
		startFrom: z.iso.date().optional(),
		endTo: z.iso.date().optional(),
		verifiedOnly: z.enum(['true', 'false']).default('false'),
		sort: z.enum(['newest', 'salary_desc', 'featured']).default('newest')
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
	.object(jobFields)
	.refine(hasOrderedDates, {
		path: ['endDate'],
		message: 'endDate must be after startDate.'
	})
	.refine(hasOrderedTimes, {
		path: ['endTime'],
		message: 'endTime must be after startTime.'
	});

/** GET /jobs — searchJobs */
export const GET: RequestHandler = async (event) => {
	try {
		const query = parseQuery(event.url, querySchema);
		const pagination = parsePagination(event.url);

		const { items, total } = await searchOpenJobs(db, {
			query: query.q,
			categoryId: query.categoryId,
			locationId: query.locationId,
			daysOfWeek: query.dayOfWeek,
			timeOfDay: query.timeOfDay,
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
