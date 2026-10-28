import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import {
	countUnreadNotifications,
	listNotificationsForUser,
	markAllNotificationsRead,
	markNotificationRead
} from './notifications.ts';

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

// A valid UUID that no seeded account owns.
const unknownUserId = '00000000-0000-4000-8000-000000000000';

const testUserId = randomUUID();
const firstNotificationId = randomUUID();
const secondNotificationId = randomUUID();

describe.skipIf(!testDatabase)('notifications', () => {
	beforeAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.insert(schema.users).values({
			id: testUserId,
			name: 'Notification Test',
			email: `${testUserId}@example.com`,
			emailVerified: true,
			role: 'STUDENT',
			status: 'ACTIVE'
		});

		await testDatabase.insert(schema.notifications).values([
			{
				id: firstNotificationId,
				userId: testUserId,
				type: 'JOB_FILLED',
				title: 'First notification'
			},
			{
				id: secondNotificationId,
				userId: testUserId,
				type: 'REVIEW_RECEIVED',
				title: 'Second notification'
			}
		]);
	});

	afterAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.delete(schema.users).where(eq(schema.users.id, testUserId));
		await testDatabase.$client.end();
	});

	it('returns an empty page for a user without notifications', async () => {
		if (!testDatabase) {
			return;
		}

		const page = await listNotificationsForUser(testDatabase, {
			userId: unknownUserId,
			unreadOnly: false,
			limit: 20,
			offset: 0
		});

		expect(page).toEqual({ items: [], total: 0 });
	});

	it('counts zero unread notifications for a user without notifications', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(countUnreadNotifications(testDatabase, unknownUserId)).resolves.toBe(0);
	});

	it('marks one notification read, then all of them', async () => {
		if (!testDatabase) {
			return;
		}

		await markNotificationRead(testDatabase, testUserId, firstNotificationId);

		expect(await readAt(firstNotificationId)).not.toBeNull();
		expect(await readAt(secondNotificationId)).toBeNull();
		await expect(countUnreadNotifications(testDatabase, testUserId)).resolves.toBe(1);

		await markAllNotificationsRead(testDatabase, testUserId);

		expect(await readAt(secondNotificationId)).not.toBeNull();
		await expect(countUnreadNotifications(testDatabase, testUserId)).resolves.toBe(0);
	});

	it('is idempotent when the notification is already read', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(
			markNotificationRead(testDatabase, testUserId, firstNotificationId)
		).resolves.toBeUndefined();
	});

	it('rejects a notification owned by another user', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(
			markNotificationRead(testDatabase, unknownUserId, firstNotificationId)
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
	});

	it('rejects an unknown notification', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(
			markNotificationRead(testDatabase, testUserId, randomUUID())
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
	});
});

async function readAt(notificationId: string): Promise<Date | null> {
	if (!testDatabase) {
		return null;
	}

	const [row] = await testDatabase
		.select({ readAt: schema.notifications.readAt })
		.from(schema.notifications)
		.where(eq(schema.notifications.id, notificationId))
		.limit(1);

	return row?.readAt ?? null;
}
