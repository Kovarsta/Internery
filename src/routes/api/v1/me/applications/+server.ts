import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toApplication } from '#lib/server/api/mappers.ts';
import { paged, parsePagination } from '#lib/server/api/pagination.ts';
import { parseQuery } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { listMyApplications } from '#lib/server/services/applications.ts';

const querySchema = z.object({
	status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']).optional()
});

/** GET /me/applications — listMyApplications */
export const GET: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['STUDENT']);
		const query = parseQuery(event.url, querySchema);
		const pagination = parsePagination(event.url);

		const { items, total } = await listMyApplications(db, {
			studentId: user.id,
			status: query.status,
			limit: pagination.pageSize,
			offset: pagination.offset
		});

		return Response.json(paged(items.map(toApplication), total, pagination));
	} catch (error) {
		return handleApiError(error);
	}
};
