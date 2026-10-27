import { afterAll, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import { getEmployerProfile, getStudentProfile } from './profiles.ts';

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

// A valid UUID that no seeded account owns.
const unknownUserId = '00000000-0000-4000-8000-000000000000';

describe.skipIf(!testDatabase)('profiles', () => {
	afterAll(async () => {
		if (testDatabase) {
			await testDatabase.$client.end();
		}
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
});
