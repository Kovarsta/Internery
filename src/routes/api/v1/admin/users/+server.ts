import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toAdminUser } from '#lib/server/api/mappers.ts';
import { paged, parsePagination } from '#lib/server/api/pagination.ts';
import { noStoreJson } from '#lib/server/api/responses.ts';
import { parseQuery } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { listAdminUsers } from '#lib/server/services/admin.ts';

const querySchema = z.object({
	q: z.string().trim().max(100).optional(),
	role: z.enum(['STUDENT', 'EMPLOYER', 'ADMIN']).optional(),
	status: z.enum(['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'LOCKED', 'DELETED']).optional()
});

/** GET /admin/users - adminListUsers */
export const GET: RequestHandler = async (event) => {
	try {
		requireRole(event.locals, ['ADMIN']);
		const query = parseQuery(event.url, querySchema);
		const pagination = parsePagination(event.url);

		const { items, total } = await listAdminUsers(db, {
			query: query.q,
			role: query.role,
			status: query.status,
			limit: pagination.pageSize,
			offset: pagination.offset
		});

		return noStoreJson(paged(items.map(toAdminUser), total, pagination));
	} catch (error) {
		return handleApiError(error);
	}
};
