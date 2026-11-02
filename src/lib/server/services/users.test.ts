import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import type { Storage } from '#lib/server/storage/client.ts';
import { BLANK_AVATAR_KEY } from '#lib/server/storage/keys.ts';
import { getAvatarKey, resetAvatar, saveAvatar, updateUserAccount } from './users.ts';

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

	it('resets the avatar to the blank key, twice without changing the result', async () => {
		if (!testDatabase) {
			return;
		}

		await resetAvatar(testDatabase, testUserId);
		await expect(getAvatarKey(testDatabase, testUserId)).resolves.toBe(BLANK_AVATAR_KEY);

		await resetAvatar(testDatabase, testUserId);
		await expect(getAvatarKey(testDatabase, testUserId)).resolves.toBe(BLANK_AVATAR_KEY);
	});

	it('stores an uploaded avatar under a new key and points the profile at it', async () => {
		if (!testDatabase) {
			return;
		}

		const objects = new Map<string, Uint8Array>();
		const fakeStorage: Storage = {
			async putObject(key, body) {
				objects.set(key, body);
			},
			async getObject() {
				return null;
			},
			async deleteObject(key) {
				objects.delete(key);
			}
		};

		const image = {
			bytes: new Uint8Array([0x52, 0x49, 0x46, 0x46]),
			contentType: 'image/webp' as const,
			extension: 'webp' as const
		};

		await saveAvatar(testDatabase, fakeStorage, testUserId, image);

		const key = await getAvatarKey(testDatabase, testUserId);

		if (!key) {
			throw new Error('Expected the profile to point at the uploaded avatar.');
		}

		expect(key.startsWith(`avatars/${testUserId}/`)).toBe(true);
		expect(key.endsWith('.webp')).toBe(true);
		expect(objects.get(key)).toEqual(image.bytes);
	});
});
