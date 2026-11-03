import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toAdminUser } from '#lib/server/api/mappers.ts';
import { noStoreJson } from '#lib/server/api/responses.ts';
import { parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { unlockUser } from '#lib/server/services/admin.ts';

const paramsSchema = z.object({
	userId: z.uuid()
});

/** POST /admin/users/{userId}/unlock - adminUnlockUser */
export const POST: RequestHandler = async (event) => {
	try {
		const admin = requireRole(event.locals, ['ADMIN']);
		const { userId } = parseParams(event.params, paramsSchema);

		const user = await unlockUser(db, { adminId: admin.id, userId });

		return noStoreJson(toAdminUser(user));
	} catch (error) {
		return handleApiError(error);
	}
};
