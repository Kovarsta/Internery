import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toPlatformStats } from '#lib/server/api/mappers.ts';
import { noStoreJson } from '#lib/server/api/responses.ts';
import { parseQuery } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { getPlatformStats } from '#lib/server/services/admin.ts';

const querySchema = z.object({
	from: z.iso.date().optional(),
	to: z.iso.date().optional()
});

/** GET /admin/stats - adminStats */
export const GET: RequestHandler = async (event) => {
	try {
		requireRole(event.locals, ['ADMIN']);
		const query = parseQuery(event.url, querySchema);

		const stats = await getPlatformStats(db, { from: query.from, to: query.to });

		return noStoreJson(toPlatformStats(stats));
	} catch (error) {
		return handleApiError(error);
	}
};
