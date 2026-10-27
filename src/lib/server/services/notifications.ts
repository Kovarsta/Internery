import { and, count, desc, eq, isNull } from 'drizzle-orm';
import type { Database } from '#lib/server/db/types.ts';
import { notifications } from '#lib/server/db/product.schema.ts';

export type NotificationRecord = typeof notifications.$inferSelect;

export type NotificationListOptions = {
	userId: string;
	unreadOnly: boolean;
	limit: number;
	offset: number;
};

export type NotificationPage = {
	items: NotificationRecord[];
	total: number;
};

/**
 * Returns one page of a user's notifications, newest first.
 *
 * `unreadOnly` restricts the result to rows where `readAt` is null.
 */
export async function listNotificationsForUser(
	database: Database,
	options: NotificationListOptions
): Promise<NotificationPage> {
	const filters = and(
		eq(notifications.userId, options.userId),
		options.unreadOnly ? isNull(notifications.readAt) : undefined
	);

	const [items, totalRows] = await Promise.all([
		database
			.select()
			.from(notifications)
			.where(filters)
			.orderBy(desc(notifications.createdAt), desc(notifications.id))
			.limit(options.limit)
			.offset(options.offset),
		database.select({ total: count() }).from(notifications).where(filters)
	]);

	return {
		items,
		total: totalRows[0]?.total ?? 0
	};
}

/** Counts a user's unread notifications for the header badge. */
export async function countUnreadNotifications(
	database: Database,
	userId: string
): Promise<number> {
	const [row] = await database
		.select({ total: count() })
		.from(notifications)
		.where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

	return row?.total ?? 0;
}
