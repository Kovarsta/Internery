import type { RequestHandler } from './$types';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toJobSummary } from '#lib/server/api/mappers.ts';
import { paged, parsePagination } from '#lib/server/api/pagination.ts';
import { noStoreJson } from '#lib/server/api/responses.ts';
import { db } from '#lib/server/db/index.ts';
import { listSavedJobs } from '#lib/server/services/saved-jobs.ts';

/** GET /me/saved-jobs — listSavedJobs */
export const GET: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['STUDENT']);
		const pagination = parsePagination(event.url);

		const { items, total } = await listSavedJobs(db, user.id, {
			limit: pagination.pageSize,
			offset: pagination.offset
		});

		return noStoreJson(paged(items.map(toJobSummary), total, pagination));
	} catch (error) {
		return handleApiError(error);
	}
};
