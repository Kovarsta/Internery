import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import { createFakeProvider } from '#lib/server/ai/fake.ts';
import type { AiProvider } from '#lib/server/ai/provider.ts';
import { getJobSuggestions, rankCandidatesLocally } from './suggestions.ts';
import { currentAiUsageDay, DAILY_AI_CALL_LIMIT } from './usage.ts';

/** The candidate shape is inferred from the function under test. */
type Candidate = Parameters<typeof rankCandidatesLocally>[0][number];

/** A complete job summary so each test only states what it cares about. */
function candidate(overrides: Partial<Candidate>): Candidate {
	return {
		id: '00000000-0000-4000-8000-000000000001',
		title: 'Part-time barista',
		locationId: '00000000-0000-4000-8000-000000000002',
		location: 'District 1, Ho Chi Minh City',
		daysOfWeek: ['SATURDAY'],
		startTime: '08:00',
		endTime: '12:00',
		salaryAmount: 60_000,
		salaryType: 'HOURLY',
		startDate: '2026-01-01',
		endDate: '2026-02-01',
		positionsNeeded: 1,
		acceptedCount: 0,
		status: 'HIRING',
		needsReview: false,
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		categoryId: '00000000-0000-4000-8000-000000000003',
		categoryName: 'Food and beverage',
		employerId: '00000000-0000-4000-8000-000000000004',
		employerOrgName: 'Acme Coffee',
		employerOrgType: 'COMPANY',
		employerVerificationStatus: 'VERIFIED',
		employerRatingAvg: null,
		employerRatingCount: null,
		description: 'Serve customers and keep the counter clean.',
		...overrides
	};
}

describe('rankCandidatesLocally', () => {
	it('puts the job with more profile terms first', () => {
		const weak = candidate({
			id: 'weak',
			title: 'Warehouse helper',
			categoryName: 'Logistics',
			description: 'Move boxes.'
		});
		const strong = candidate({
			id: 'strong',
			title: 'Barista',
			categoryName: 'Food and beverage',
			description: 'Serve customers and handle cash.'
		});

		const ranked = rankCandidatesLocally([weak, strong], ['barista', 'customer service']);

		expect(ranked.map((job) => job.id)).toEqual(['strong', 'weak']);
	});

	it('breaks ties by newest first', () => {
		const older = candidate({ id: 'older', createdAt: new Date('2026-01-01T00:00:00.000Z') });
		const newer = candidate({ id: 'newer', createdAt: new Date('2026-02-01T00:00:00.000Z') });

		const ranked = rankCandidatesLocally([older, newer], ['barista']);

		expect(ranked.map((job) => job.id)).toEqual(['newer', 'older']);
	});

	it('does not mutate the input array', () => {
		const jobs = [candidate({ id: 'a' }), candidate({ id: 'b' })];
		const originalOrder = jobs.map((job) => job.id);

		rankCandidatesLocally(jobs, ['barista']);

		expect(jobs.map((job) => job.id)).toEqual(originalOrder);
	});
});

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

const studentId = randomUUID();
const blankStudentId = randomUUID();
const employerId = randomUUID();
const categoryId = randomUUID();
const locationId = randomUUID();
const baristaJobId = randomUUID();
const cashierJobId = randomUUID();
const warehouseJobId = randomUUID();

describe.skipIf(!testDatabase)('getJobSuggestions', () => {
	beforeAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.insert(schema.users).values([
			{
				id: studentId,
				name: 'Suggestion Student',
				email: `${studentId}@example.com`,
				emailVerified: true,
				role: 'STUDENT',
				status: 'ACTIVE'
			},
			{
				id: blankStudentId,
				name: 'Blank Student',
				email: `${blankStudentId}@example.com`,
				emailVerified: true,
				role: 'STUDENT',
				status: 'ACTIVE'
			},
			{
				id: employerId,
				name: 'Suggestion Employer',
				email: `${employerId}@example.com`,
				emailVerified: true,
				role: 'EMPLOYER',
				status: 'ACTIVE'
			}
		]);

		await testDatabase.insert(schema.studentProfiles).values([
			{
				userId: studentId,
				major: 'Business Administration',
				skills: ['Customer service', 'Cash handling']
			},
			{ userId: blankStudentId }
		]);

		await testDatabase
			.insert(schema.categories)
			.values({ id: categoryId, name: 'Food and beverage' });
		await testDatabase.insert(schema.locations).values({
			id: locationId,
			countryCode: 'VN',
			countryName: 'Vietnam',
			name: 'District 1',
			displayName: 'District 1, Ho Chi Minh City',
			slug: `suggest-${locationId}`,
			searchText: 'district 1 ho chi minh city',
			// Keep the shared location-count test unaffected.
			isActive: false
		});

		await testDatabase.insert(schema.jobs).values([
			{
				id: baristaJobId,
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
				endDate: '2026-02-01',
				createdAt: new Date('2026-01-03T00:00:00.000Z')
			},
			{
				id: cashierJobId,
				employerId,
				categoryId,
				title: 'Cashier',
				description: 'Handle customer service and cash at the counter.',
				locationId,
				daysOfWeek: ['SUNDAY'],
				startTime: '13:00',
				endTime: '17:00',
				salaryAmount: 55_000,
				salaryType: 'HOURLY',
				startDate: '2026-01-01',
				endDate: '2026-02-01',
				createdAt: new Date('2026-01-02T00:00:00.000Z')
			},
			{
				id: warehouseJobId,
				employerId,
				categoryId,
				title: 'Warehouse helper',
				description: 'Move boxes.',
				locationId,
				daysOfWeek: ['MONDAY'],
				startTime: '08:00',
				endTime: '12:00',
				salaryAmount: 50_000,
				salaryType: 'HOURLY',
				startDate: '2026-01-01',
				endDate: '2026-02-01',
				createdAt: new Date('2026-01-01T00:00:00.000Z')
			}
		]);
	});

	beforeEach(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.delete(schema.aiUsage).where(eq(schema.aiUsage.userId, studentId));
	});

	afterAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.delete(schema.jobs).where(eq(schema.jobs.employerId, employerId));
		await testDatabase.delete(schema.users).where(eq(schema.users.id, studentId));
		await testDatabase.delete(schema.users).where(eq(schema.users.id, blankStudentId));
		await testDatabase.delete(schema.users).where(eq(schema.users.id, employerId));
		await testDatabase.delete(schema.categories).where(eq(schema.categories.id, categoryId));
		await testDatabase.delete(schema.locations).where(eq(schema.locations.id, locationId));
		await testDatabase.$client.end();
	});

	it('rejects a profile without a major', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(
			getJobSuggestions(testDatabase, createFakeProvider(), blankStudentId)
		).rejects.toMatchObject({ code: 'PROFILE_INCOMPLETE' });
	});

	it('falls back when the provider fails', async () => {
		if (!testDatabase) {
			return;
		}

		const provider = createFakeProvider({
			rankJobs: async () => {
				throw new Error('provider down');
			}
		});

		const result = await getJobSuggestions(testDatabase, provider, studentId);

		expect(result.source).toBe('FALLBACK');
		expect(result.notice).not.toBeNull();
		expect(result.items.length).toBeGreaterThan(0);
	});

	it('keeps the provider order and drops invented ids', async () => {
		if (!testDatabase) {
			return;
		}

		const provider = createFakeProvider({
			rankJobs: async () => ({
				rankedJobIds: [cashierJobId, randomUUID(), baristaJobId, cashierJobId],
				model: 'fake-ai'
			})
		});

		const result = await getJobSuggestions(testDatabase, provider, studentId);

		expect(result.source).toBe('AI');
		expect(result.notice).toBeNull();
		expect(result.items.map((item) => item.job.id)).toEqual([cashierJobId, baristaJobId]);
	});

	it('falls back when every ranked id is invented', async () => {
		if (!testDatabase) {
			return;
		}

		const provider = createFakeProvider({
			rankJobs: async () => ({ rankedJobIds: [randomUUID()], model: 'fake-ai' })
		});

		const result = await getJobSuggestions(testDatabase, provider, studentId);

		expect(result.source).toBe('FALLBACK');
	});

	it('falls back without calling the provider when the limit is spent', async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.insert(schema.aiUsage).values({
			userId: studentId,
			day: currentAiUsageDay(),
			count: DAILY_AI_CALL_LIMIT
		});

		const rankJobs = vi.fn<AiProvider['rankJobs']>();

		const result = await getJobSuggestions(
			testDatabase,
			createFakeProvider({ rankJobs }),
			studentId
		);

		expect(result.source).toBe('FALLBACK');
		expect(rankJobs).not.toHaveBeenCalled();
	});
});
