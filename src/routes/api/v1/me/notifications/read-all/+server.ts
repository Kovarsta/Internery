import type { RequestHandler } from './$types';
import { requireActiveAccount } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { db } from '#lib/server/db/index.ts';
import { markAllNotificationsRead } from '#lib/server/services/notifications.ts';

/** POST /me/notifications/read-all — markAllNotificationsRead */
export const POST: RequestHandler = async (event) => {
	try {
		const user = requireActiveAccount(event.locals);

		await markAllNotificationsRead(db, user.id);

		return new Response(null, { status: 204 });
	} catch (error) {
		return handleApiError(error);
	}
};
