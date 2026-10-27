import { afterAll, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import { listActiveCategories } from './categories.ts';

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

describe.skipIf(!testDatabase)('listActiveCategories', () => {
	afterAll(async () => {
		if (testDatabase) {
			await testDatabase.$client.end();
		}
	});

	it('returns only active categories', async () => {
		if (!testDatabase) {
			return;
		}

		const rows = await listActiveCategories(testDatabase);

		expect(rows.every((row) => row.isActive)).toBe(true);
	});
});
