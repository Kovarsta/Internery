import type { RequestHandler } from './$types';
import { requireActiveAccount } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { db } from '#lib/server/db/index.ts';
import { countUnreadNotifications } from '#lib/server/services/notifications.ts';

/** GET /me/notifications/unread-count — getUnreadCount */
export const GET: RequestHandler = async (event) => {
	try {
		const user = requireActiveAccount(event.locals);
		const unread = await countUnreadNotifications(db, user.id);

		return Response.json({ unread });
	} catch (error) {
		return handleApiError(error);
	}
};
