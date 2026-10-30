import type { RequestHandler } from './$types';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toWorkRecord } from '#lib/server/api/mappers.ts';
import { paged, parsePagination } from '#lib/server/api/pagination.ts';
import { db } from '#lib/server/db/index.ts';
import { listStudentWorkRecords } from '#lib/server/services/work-records.ts';

/** GET /me/work-records — listMyWorkRecords */
export const GET: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['STUDENT']);
		const pagination = parsePagination(event.url);

		const { items, total } = await listStudentWorkRecords(db, user.id, {
			limit: pagination.pageSize,
			offset: pagination.offset
		});

		const records = items.map((record) => toWorkRecord(record, event.url.origin));

		return Response.json(paged(records, total, pagination));
	} catch (error) {
		return handleApiError(error);
	}
};
