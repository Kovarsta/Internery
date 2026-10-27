import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireActiveAccount } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toNotification } from '#lib/server/api/mappers.ts';
import { paged, parsePagination } from '#lib/server/api/pagination.ts';
import { parseQuery } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { listNotificationsForUser } from '#lib/server/services/notifications.ts';

const querySchema = z.object({
	unread: z.enum(['true', 'false']).default('false')
});

/** GET /me/notifications — listNotifications */
export const GET: RequestHandler = async (event) => {
	try {
		const user = requireActiveAccount(event.locals);
		const query = parseQuery(event.url, querySchema);
		const pagination = parsePagination(event.url);

		const { items, total } = await listNotificationsForUser(db, {
			userId: user.id,
			unreadOnly: query.unread === 'true',
			limit: pagination.pageSize,
			offset: pagination.offset
		});

		return Response.json(paged(items.map(toNotification), total, pagination));
	} catch (error) {
		return handleApiError(error);
	}
};
