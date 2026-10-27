import { afterAll, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import { countUnreadNotifications, listNotificationsForUser } from './notifications.ts';

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

// A valid UUID that no seeded account owns.
const unknownUserId = '00000000-0000-4000-8000-000000000000';

describe.skipIf(!testDatabase)('notifications', () => {
	afterAll(async () => {
		if (testDatabase) {
			await testDatabase.$client.end();
		}
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
});
