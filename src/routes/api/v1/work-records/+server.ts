import type { RequestHandler } from './$types';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toWorkRecordCard } from '#lib/server/api/mappers.ts';
import { paged, parsePagination } from '#lib/server/api/pagination.ts';
import { db } from '#lib/server/db/index.ts';
import { listPublicWorkRecords } from '#lib/server/services/work-records.ts';

/** GET /work-records — browseWorkRecordDirectory */
export const GET: RequestHandler = async (event) => {
	try {
		const pagination = parsePagination(event.url);

		const { items, total } = await listPublicWorkRecords(db, {
			limit: pagination.pageSize,
			offset: pagination.offset
		});

		return Response.json(paged(items.map(toWorkRecordCard), total, pagination));
	} catch (error) {
		return handleApiError(error);
	}
};
