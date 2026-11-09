import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toModerationItem } from '#lib/server/api/mappers.ts';
import { paged, parsePagination } from '#lib/server/api/pagination.ts';
import { noStoreJson } from '#lib/server/api/responses.ts';
import { parseQuery } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { listModerationQueue } from '#lib/server/services/admin.ts';

const querySchema = z.object({
	q: z.string().trim().max(100).optional()
});

/** GET /admin/moderation-queue - adminModerationQueue */
export const GET: RequestHandler = async (event) => {
	try {
		requireRole(event.locals, ['ADMIN']);
		const query = parseQuery(event.url, querySchema);
		const pagination = parsePagination(event.url);

		const { items, total } = await listModerationQueue(db, {
			search: query.q === '' ? undefined : query.q,
			limit: pagination.pageSize,
			offset: pagination.offset
		});

		return noStoreJson(paged(items.map(toModerationItem), total, pagination));
	} catch (error) {
		return handleApiError(error);
	}
};
