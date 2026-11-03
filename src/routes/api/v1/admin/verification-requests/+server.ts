import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toVerificationRequest } from '#lib/server/api/mappers.ts';
import { paged, parsePagination } from '#lib/server/api/pagination.ts';
import { noStoreJson } from '#lib/server/api/responses.ts';
import { parseQuery } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { listVerificationRequests } from '#lib/server/services/admin.ts';

const querySchema = z.object({
	status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional()
});

/** GET /admin/verification-requests - adminListVerificationRequests */
export const GET: RequestHandler = async (event) => {
	try {
		requireRole(event.locals, ['ADMIN']);
		const query = parseQuery(event.url, querySchema);
		const pagination = parsePagination(event.url);

		const { items, total } = await listVerificationRequests(db, {
			status: query.status,
			limit: pagination.pageSize,
			offset: pagination.offset
		});

		return noStoreJson(paged(items.map(toVerificationRequest), total, pagination));
	} catch (error) {
		return handleApiError(error);
	}
};
