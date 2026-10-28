import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireActiveAccount } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { markNotificationRead } from '#lib/server/services/notifications.ts';

const paramsSchema = z.object({
	notificationId: z.uuid()
});

/** POST /me/notifications/{notificationId}/read — markNotificationRead */
export const POST: RequestHandler = async (event) => {
	try {
		const user = requireActiveAccount(event.locals);
		const { notificationId } = parseParams(event.params, paramsSchema);

		await markNotificationRead(db, user.id, notificationId);

		return new Response(null, { status: 204 });
	} catch (error) {
		return handleApiError(error);
	}
};
