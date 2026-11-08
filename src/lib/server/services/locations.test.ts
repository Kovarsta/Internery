import { beforeAll, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import { findLocationById, searchLocations } from './locations.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

describe.skipIf(!testDatabase)('locations', () => {
	beforeAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.select({ id: schema.locations.id }).from(schema.locations).limit(1);
	});

	it('finds a city by an alias', async () => {
		if (!testDatabase) {
			return;
		}

		const results = await searchLocations(testDatabase, { query: 'hcm', limit: 10 });

		expect(results[0]?.name).toBe('Ho Chi Minh City');
	});

	it('normalizes Vietnamese diacritics in the query', async () => {
		if (!testDatabase) {
			return;
		}

		const results = await searchLocations(testDatabase, { query: 'Hà Nội', limit: 10 });

		expect(results[0]?.name).toBe('Hanoi');
	});

	it('finds a remote location by its alias', async () => {
		if (!testDatabase) {
			return;
		}

		const results = await searchLocations(testDatabase, { query: 'remote', limit: 10 });

		expect(results[0]?.isRemote).toBe(true);
	});

	it('returns the seeded cities for an empty query, remote last', async () => {
		if (!testDatabase) {
			return;
		}

		const results = await searchLocations(testDatabase, { query: '', limit: 20 });

		expect(results).toHaveLength(7);
		expect(results.at(-1)?.isRemote).toBe(true);
	});

	it('returns one location by id', async () => {
		if (!testDatabase) {
			return;
		}

		const location = await findLocationById(testDatabase, '80000000-0000-4000-8000-000000000002');

		expect(location?.name).toBe('Ho Chi Minh City');
		await expect(
			findLocationById(testDatabase, '80000000-0000-4000-8000-000000000099')
		).resolves.toBeNull();
	});
});
