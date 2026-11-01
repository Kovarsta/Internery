import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import { updateUserAccount, getAvatarKey } from './users.ts';

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

const testUserId = randomUUID();

describe.skipIf(!testDatabase)('users', () => {
	beforeAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.insert(schema.users).values({
			id: testUserId,
			name: 'Account Test',
			email: `${testUserId}@example.com`,
			emailVerified: true,
			role: 'STUDENT',
			status: 'ACTIVE'
		});

		await testDatabase.insert(schema.userProfiles).values({ userId: testUserId });
	});

	afterAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.delete(schema.users).where(eq(schema.users.id, testUserId));
		await testDatabase.$client.end();
	});

	it('updates name and phone without touching the other field', async () => {
		if (!testDatabase) {
			return;
		}

		const renamed = await updateUserAccount(testDatabase, testUserId, {
			fullName: 'Updated Name'
		});

		expect(renamed.user.name).toBe('Updated Name');
		expect(renamed.profile?.phone).toBeNull();

		const withPhone = await updateUserAccount(testDatabase, testUserId, {
			phone: '0900000000'
		});

		expect(withPhone.user.name).toBe('Updated Name');
		expect(withPhone.profile?.phone).toBe('0900000000');

		const cleared = await updateUserAccount(testDatabase, testUserId, { phone: null });

		expect(cleared.profile?.phone).toBeNull();
	});

	it('rejects an unknown user', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(
			updateUserAccount(testDatabase, randomUUID(), { fullName: 'Nobody' })
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
	});

	it('returns the stored avatar key', async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase
			.update(schema.userProfiles)
			.set({ avatarKey: 'avatars/test/avatar.png' })
			.where(eq(schema.userProfiles.userId, testUserId));

		await expect(getAvatarKey(testDatabase, testUserId)).resolves.toBe('avatars/test/avatar.png');

		await testDatabase
			.update(schema.userProfiles)
			.set({ avatarKey: null })
			.where(eq(schema.userProfiles.userId, testUserId));
	});

	it('returns null without an avatar or a profile row', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(getAvatarKey(testDatabase, testUserId)).resolves.toBeNull();
		await expect(getAvatarKey(testDatabase, randomUUID())).resolves.toBeNull();
	});
});
