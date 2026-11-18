import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import { getAiConsent, hasActiveAiConsent, setAiConsent } from './consent.ts';

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

const studentId = randomUUID();
const employerId = randomUUID();
const categoryId = randomUUID();
const locationId = randomUUID();
const jobId = randomUUID();

describe.skipIf(!testDatabase)('ai consent', () => {
	beforeAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.insert(schema.users).values([
			{
				id: studentId,
				name: 'Consent Student',
				email: `${studentId}@example.com`,
				emailVerified: true,
				role: 'STUDENT',
				status: 'ACTIVE'
			},
			{
				id: employerId,
				name: 'Consent Employer',
				email: `${employerId}@example.com`,
				emailVerified: true,
				role: 'EMPLOYER',
				status: 'ACTIVE'
			}
		]);

		await testDatabase.insert(schema.studentProfiles).values({ userId: studentId });
		await testDatabase
			.insert(schema.categories)
			.values({ id: categoryId, name: `AI ${categoryId}` });
		await testDatabase.insert(schema.locations).values({
			id: locationId,
			countryCode: 'VN',
			countryName: 'Vietnam',
			name: 'District 1',
			displayName: 'District 1, Ho Chi Minh City',
			slug: `ai-${locationId}`,
			searchText: 'district 1 ho chi minh city',
			// Keep the shared location-count test unaffected: this row exists
			// only as a foreign key for the job.
			isActive: false
		});
		await testDatabase.insert(schema.jobs).values({
			id: jobId,
			employerId,
			categoryId,
			title: 'Part-time barista',
			description: 'Serve customers.',
			locationId,
			daysOfWeek: ['SATURDAY'],
			startTime: '08:00',
			endTime: '12:00',
			salaryAmount: 60_000,
			salaryType: 'HOURLY',
			startDate: '2026-01-01',
			endDate: '2026-02-01'
		});
	});

	beforeEach(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase
			.delete(schema.aiExplanations)
			.where(eq(schema.aiExplanations.studentId, studentId));
		await testDatabase.delete(schema.aiConsents).where(eq(schema.aiConsents.studentId, studentId));
	});

	afterAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.delete(schema.jobs).where(eq(schema.jobs.id, jobId));
		await testDatabase.delete(schema.users).where(eq(schema.users.id, studentId));
		await testDatabase.delete(schema.users).where(eq(schema.users.id, employerId));
		await testDatabase.delete(schema.categories).where(eq(schema.categories.id, categoryId));
		await testDatabase.delete(schema.locations).where(eq(schema.locations.id, locationId));
		await testDatabase.$client.end();
	});

	it('reports no consent before the student decides', async () => {
		if (!testDatabase) {
			return;
		}

		const state = await getAiConsent(testDatabase, studentId);

		expect(state.granted).toBe(false);
		expect(state.consentedAt).toBeNull();
		expect(state.withdrawnAt).toBeNull();
		expect(state.dataSent.length).toBeGreaterThan(0);
		await expect(hasActiveAiConsent(testDatabase, studentId)).resolves.toBe(false);
	});

	it('grants consent and keeps the original timestamp on a repeat', async () => {
		if (!testDatabase) {
			return;
		}

		const first = await setAiConsent(testDatabase, studentId, true);

		expect(first.granted).toBe(true);
		expect(first.consentedAt).not.toBeNull();
		expect(first.withdrawnAt).toBeNull();

		const second = await setAiConsent(testDatabase, studentId, true);

		expect(second.granted).toBe(true);
		expect(second.consentedAt?.getTime()).toBe(first.consentedAt?.getTime());
		await expect(hasActiveAiConsent(testDatabase, studentId)).resolves.toBe(true);
	});

	it('withdrawing deletes the cached explanations', async () => {
		if (!testDatabase) {
			return;
		}

		await setAiConsent(testDatabase, studentId, true);

		await testDatabase.insert(schema.aiExplanations).values({
			studentId,
			jobId,
			cvHash: 'a'.repeat(64),
			verdict: 'FIT',
			reasons: [{ text: 'Customer service experience.', cvQuote: 'customer service' }],
			gaps: [],
			model: 'fake-ai'
		});

		const state = await setAiConsent(testDatabase, studentId, false);

		expect(state.granted).toBe(false);
		expect(state.withdrawnAt).not.toBeNull();
		await expect(hasActiveAiConsent(testDatabase, studentId)).resolves.toBe(false);

		const remaining = await testDatabase
			.select()
			.from(schema.aiExplanations)
			.where(eq(schema.aiExplanations.studentId, studentId));

		expect(remaining).toHaveLength(0);
	});

	it('does not create a consent row when the student never granted it', async () => {
		if (!testDatabase) {
			return;
		}

		const state = await setAiConsent(testDatabase, studentId, false);

		expect(state.granted).toBe(false);
		expect(state.consentedAt).toBeNull();

		const rows = await testDatabase
			.select()
			.from(schema.aiConsents)
			.where(eq(schema.aiConsents.studentId, studentId));

		expect(rows).toHaveLength(0);
	});
});
