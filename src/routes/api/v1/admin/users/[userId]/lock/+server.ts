import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toAdminUser } from '#lib/server/api/mappers.ts';
import { noStoreJson } from '#lib/server/api/responses.ts';
import { parseOptionalJson, parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { lockUser } from '#lib/server/services/admin.ts';

const paramsSchema = z.object({
	userId: z.uuid()
});

const bodySchema = z.object({
	reason: z.string().trim().max(500).optional()
});

/** POST /admin/users/{userId}/lock - adminLockUser */
export const POST: RequestHandler = async (event) => {
	try {
		const admin = requireRole(event.locals, ['ADMIN']);
		const { userId } = parseParams(event.params, paramsSchema);
		const body = await parseOptionalJson(event.request, bodySchema);

		// An empty reason is the same as leaving it out; the column stores null.
		const reason = body?.reason ? body.reason : null;

		const user = await lockUser(db, { adminId: admin.id, userId, reason });

		return noStoreJson(toAdminUser(user));
	} catch (error) {
		return handleApiError(error);
	}
};
