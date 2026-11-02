import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toMyJob } from '#lib/server/api/mappers.ts';
import { paged, parsePagination } from '#lib/server/api/pagination.ts';
import { noStoreJson } from '#lib/server/api/responses.ts';
import { parseQuery } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { listEmployerJobs } from '#lib/server/services/jobs.ts';

const querySchema = z.object({
	status: z.enum(['HIRING', 'FILLED', 'COMPLETED', 'CANCELLED']).optional()
});

/** GET /me/jobs — listMyJobs */
export const GET: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['EMPLOYER']);
		const query = parseQuery(event.url, querySchema);
		const pagination = parsePagination(event.url);

		const { items, total } = await listEmployerJobs(db, {
			employerId: user.id,
			status: query.status,
			limit: pagination.pageSize,
			offset: pagination.offset
		});

		return noStoreJson(paged(items.map(toMyJob), total, pagination));
	} catch (error) {
		return handleApiError(error);
	}
};
