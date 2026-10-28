import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import {
	getEmployerProfile,
	getStudentProfile,
	saveEmployerProfile,
	saveStudentProfile
} from './profiles.ts';

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

// A valid UUID that no seeded account owns.
const unknownUserId = '00000000-0000-4000-8000-000000000000';
const testUserId = randomUUID();

describe.skipIf(!testDatabase)('profiles', () => {
	beforeAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.insert(schema.users).values({
			id: testUserId,
			name: 'Profile Test',
			email: `${testUserId}@example.com`,
			emailVerified: true,
			role: 'STUDENT',
			status: 'ACTIVE'
		});
	});

	afterAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.delete(schema.users).where(eq(schema.users.id, testUserId));
		await testDatabase.$client.end();
	});

	it('returns null when the student profile does not exist', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(getStudentProfile(testDatabase, unknownUserId)).resolves.toBeNull();
	});

	it('returns null when the employer profile does not exist', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(getEmployerProfile(testDatabase, unknownUserId)).resolves.toBeNull();
	});

	it('creates and replaces the student profile', async () => {
		if (!testDatabase) {
			return;
		}

		const created = await saveStudentProfile(testDatabase, testUserId, {
			university: 'VNU',
			major: 'Computer Science',
			skills: ['TypeScript'],
			availability: 'Evenings',
			bio: null
		});

		expect(created.university).toBe('VNU');

		const updated = await saveStudentProfile(testDatabase, testUserId, {
			university: 'HUST',
			major: 'Software Engineering',
			skills: ['SQL', 'Testing'],
			availability: null,
			bio: 'Updated'
		});

		expect(updated.university).toBe('HUST');
		expect(updated.skills).toEqual(['SQL', 'Testing']);
		expect(updated.bio).toBe('Updated');
	});

	it('creates and replaces the employer profile without touching verification', async () => {
		if (!testDatabase) {
			return;
		}

		const created = await saveEmployerProfile(testDatabase, testUserId, {
			orgName: 'Acme',
			orgType: 'COMPANY',
			description: null,
			address: null,
			contactPhone: null
		});

		expect(created.orgName).toBe('Acme');

		await testDatabase
			.update(schema.employerProfiles)
			.set({ verificationStatus: 'VERIFIED' })
			.where(eq(schema.employerProfiles.userId, testUserId));

		const updated = await saveEmployerProfile(testDatabase, testUserId, {
			orgName: 'Acme Coffee',
			orgType: 'INDIVIDUAL',
			description: 'Updated',
			address: 'Hanoi',
			contactPhone: '0900000000'
		});

		expect(updated.orgName).toBe('Acme Coffee');
		expect(updated.verificationStatus).toBe('VERIFIED');
	});
});
