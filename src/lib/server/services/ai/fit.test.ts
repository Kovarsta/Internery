import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import type { Storage } from '#lib/server/storage/client.ts';
import { createFakeProvider } from '#lib/server/ai/fake.ts';
import type { AiProvider } from '#lib/server/ai/provider.ts';
import { getJobFit } from './fit.ts';
import { currentAiUsageDay, DAILY_AI_CALL_LIMIT } from './usage.ts';

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

const cvBytes = readFileSync(fileURLToPath(new URL('../../ai/fixtures/cv.pdf', import.meta.url)));

const studentId = randomUUID();
const employerId = randomUUID();
const categoryId = randomUUID();
const locationId = randomUUID();
const jobId = randomUUID();

const storage: Storage = {
	async getObject() {
		return {
			body: new Blob([cvBytes]).stream(),
			contentType: 'application/pdf',
			etag: null,
			contentLength: cvBytes.length
		};
	},
	async putObject() {},
	async deleteObject() {},
	async listObjects() {
		return { objects: [], nextToken: null };
	},
	async deleteObjects() {}
};

describe.skipIf(!testDatabase)('getJobFit', () => {
	beforeAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.insert(schema.users).values([
			{
				id: studentId,
				name: 'Fit Student',
				email: `${studentId}@example.com`,
				emailVerified: true,
				role: 'STUDENT',
				status: 'ACTIVE'
			},
			{
				id: employerId,
				name: 'Fit Employer',
				email: `${employerId}@example.com`,
				emailVerified: true,
				role: 'EMPLOYER',
				status: 'ACTIVE'
			}
		]);

		await testDatabase.insert(schema.studentProfiles).values({
			userId: studentId,
			cvKey: 'cv/fit-student.pdf',
			cvFileName: 'cv.pdf',
			cvMimeType: 'application/pdf',
			cvSizeBytes: cvBytes.length
		});
		await testDatabase.insert(schema.userProfiles).values({ userId: studentId });
		await testDatabase
			.insert(schema.categories)
			.values({ id: categoryId, name: `Fit ${categoryId}` });
		await testDatabase.insert(schema.locations).values({
			id: locationId,
			countryCode: 'VN',
			countryName: 'Vietnam',
			name: 'District 3',
			displayName: 'District 3, Ho Chi Minh City',
			slug: `fit-${locationId}`,
			searchText: 'district 3 ho chi minh city',
			// Keep the shared location-count test unaffected.
			isActive: false
		});
		await testDatabase.insert(schema.jobs).values({
			id: jobId,
			employerId,
			categoryId,
			title: 'Part-time barista',
			description: 'Serve customers and keep the counter clean.',
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
		await testDatabase.delete(schema.aiUsage).where(eq(schema.aiUsage.userId, studentId));
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

	it('refuses to read the CV without consent', async () => {
		if (!testDatabase) {
			return;
		}

		const explainFit = vi.fn<AiProvider['explainFit']>();

		await expect(
			getJobFit(testDatabase, createFakeProvider({ explainFit }), storage, {
				studentId,
				jobId
			})
		).rejects.toMatchObject({ code: 'AI_CONSENT_REQUIRED' });

		expect(explainFit).not.toHaveBeenCalled();
	});

	it('drops unverifiable quotes and returns the cached answer next time', async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase
			.insert(schema.aiConsents)
			.values({ studentId, consentedAt: new Date(), withdrawnAt: null });

		const explainFit = vi.fn<AiProvider['explainFit']>(async () => ({
			verdict: 'FIT' as const,
			reasons: [
				{ text: 'The job needs customer service.', cvQuote: 'customer service at a coffee shop' },
				{ text: 'Invented.', cvQuote: 'managed a team of fifty people' }
			],
			gaps: ['A', 'B', 'C', 'D'],
			model: 'fake-ai'
		}));

		const provider = createFakeProvider({ explainFit });

		const first = await getJobFit(testDatabase, provider, storage, { studentId, jobId });

		expect(first.cached).toBe(false);
		expect(first.reasons).toEqual([
			{ text: 'The job needs customer service.', cvQuote: 'customer service at a coffee shop' }
		]);
		expect(first.gaps).toHaveLength(3);

		const second = await getJobFit(testDatabase, provider, storage, { studentId, jobId });

		expect(second.cached).toBe(true);
		expect(second.reasons).toEqual(first.reasons);
		expect(explainFit).toHaveBeenCalledTimes(1);

		const usage = await testDatabase
			.select()
			.from(schema.aiUsage)
			.where(eq(schema.aiUsage.userId, studentId));

		expect(usage).toHaveLength(1);
		expect(usage[0]?.count).toBe(1);
	});

	it('releases the daily call when the provider fails', async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase
			.insert(schema.aiConsents)
			.values({ studentId, consentedAt: new Date(), withdrawnAt: null });

		const provider = createFakeProvider({
			explainFit: async () => {
				throw new Error('provider down');
			}
		});

		await expect(getJobFit(testDatabase, provider, storage, { studentId, jobId })).rejects.toThrow(
			'provider down'
		);

		const usage = await testDatabase
			.select()
			.from(schema.aiUsage)
			.where(eq(schema.aiUsage.userId, studentId));

		expect(usage[0]?.count ?? 0).toBe(0);
	});

	it('reports the rate limit without calling the provider', async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase
			.insert(schema.aiConsents)
			.values({ studentId, consentedAt: new Date(), withdrawnAt: null });
		await testDatabase.insert(schema.aiUsage).values({
			userId: studentId,
			day: currentAiUsageDay(),
			count: DAILY_AI_CALL_LIMIT
		});

		const explainFit = vi.fn<AiProvider['explainFit']>();

		await expect(
			getJobFit(testDatabase, createFakeProvider({ explainFit }), storage, {
				studentId,
				jobId
			})
		).rejects.toMatchObject({ code: 'AI_RATE_LIMITED' });

		expect(explainFit).not.toHaveBeenCalled();
	});
});
