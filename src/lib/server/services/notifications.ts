import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import type { Database } from '#lib/server/db/types.ts';
import { notifications } from '#lib/server/db/product.schema.ts';

export type NotificationRecord = typeof notifications.$inferSelect;
export type NotificationInsert = typeof notifications.$inferInsert;

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

/**
 * Marks one of the user's notifications as read.
 *
 * Idempotent. A notification that does not exist or belongs to another user
 * throws `NOT_FOUND`, so ownership is not leaked.
 */
export async function markNotificationRead(
	database: Database,
	userId: string,
	notificationId: string
): Promise<void> {
	const updated = await database
		.update(notifications)
		.set({ readAt: new Date() })
		.where(
			and(
				eq(notifications.id, notificationId),
				eq(notifications.userId, userId),
				isNull(notifications.readAt)
			)
		)
		.returning({ id: notifications.id });

	if (updated.length > 0) {
		return;
	}

	const [existing] = await database
		.select({ id: notifications.id })
		.from(notifications)
		.where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
		.limit(1);

	if (!existing) {
		throw new DomainError('NOT_FOUND');
	}
}

/** Marks every unread notification of the user as read. */
export async function markAllNotificationsRead(database: Database, userId: string): Promise<void> {
	await database
		.update(notifications)
		.set({ readAt: new Date() })
		.where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
