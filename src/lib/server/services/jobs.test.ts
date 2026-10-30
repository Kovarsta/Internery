import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import { findJobDetail, listEmployerJobs, searchOpenJobs } from './jobs.ts';

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

const verifiedEmployerId = randomUUID();
const unverifiedEmployerId = randomUUID();
const categoryId = randomUUID();

const baristaJobId = randomUUID();
const tutorJobId = randomUUID();
const hiddenJobId = randomUUID();
const filledJobId = randomUUID();

const defaultFilters = {
	verifiedOnly: false,
	sort: 'newest' as const,
	limit: 20,
	offset: 0
};

describe.skipIf(!testDatabase)('job reads', () => {
	beforeAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.insert(schema.users).values([
			{
				id: verifiedEmployerId,
				name: 'Verified Employer',
				email: `${verifiedEmployerId}@example.com`,
				emailVerified: true,
				role: 'EMPLOYER',
				status: 'ACTIVE'
			},
			{
				id: unverifiedEmployerId,
				name: 'Unverified Employer',
				email: `${unverifiedEmployerId}@example.com`,
				emailVerified: true,
				role: 'EMPLOYER',
				status: 'ACTIVE'
			}
		]);

		await testDatabase.insert(schema.employerProfiles).values([
			{
				userId: verifiedEmployerId,
				orgName: 'Verified Coffee',
				orgType: 'COMPANY',
				verificationStatus: 'VERIFIED',
				ratingAvg: 4.5,
				ratingCount: 2
			},
			{
				userId: unverifiedEmployerId,
				orgName: 'Tutoring Studio',
				orgType: 'INDIVIDUAL',
				verificationStatus: 'UNVERIFIED'
			}
		]);

		await testDatabase.insert(schema.categories).values({
			id: categoryId,
			name: `Job reads ${categoryId}`
		});

		await testDatabase.insert(schema.jobs).values([
			{
				id: baristaJobId,
				employerId: verifiedEmployerId,
				categoryId,
				title: 'Part-time barista',
				description: 'Serve coffee on weekends.',
				location: 'Hanoi',
				schedule: 'Weekends',
				salaryAmount: 30_000,
				salaryType: 'HOURLY',
				startDate: '2026-11-01',
				endDate: '2026-11-30',
				positionsNeeded: 2,
				createdAt: new Date('2026-01-01T00:00:00Z')
			},
			{
				id: tutorJobId,
				employerId: unverifiedEmployerId,
				categoryId,
				title: 'Math tutor',
				description: 'Help a grade 9 student with algebra.',
				location: 'Saigon',
				schedule: 'Weekday evenings',
				salaryAmount: 100_000,
				salaryType: 'HOURLY',
				startDate: '2026-12-01',
				endDate: '2026-12-31',
				positionsNeeded: 1,
				createdAt: new Date('2026-01-02T00:00:00Z')
			},
			{
				id: hiddenJobId,
				employerId: verifiedEmployerId,
				categoryId,
				title: 'Cash handling assistant',
				description: 'Reported by students.',
				location: 'Hanoi',
				schedule: 'Evenings',
				salaryAmount: 50_000,
				salaryType: 'DAILY',
				startDate: '2026-11-01',
				endDate: '2026-11-15',
				positionsNeeded: 1,
				isHidden: true,
				createdAt: new Date('2026-01-03T00:00:00Z')
			},
			{
				id: filledJobId,
				employerId: verifiedEmployerId,
				categoryId,
				title: 'Filled barista role',
				description: 'Already filled.',
				location: 'Hanoi',
				schedule: 'Weekends',
				salaryAmount: 20_000,
				salaryType: 'HOURLY',
				startDate: '2026-10-01',
				endDate: '2026-10-31',
				positionsNeeded: 1,
				status: 'FILLED',
				createdAt: new Date('2026-01-04T00:00:00Z')
			}
		]);

		await testDatabase.insert(schema.applications).values([
			{
				jobId: baristaJobId,
				studentId: unverifiedEmployerId,
				status: 'PENDING'
			},
			{
				jobId: baristaJobId,
				studentId: verifiedEmployerId,
				status: 'WITHDRAWN'
			},
			{
				jobId: tutorJobId,
				studentId: verifiedEmployerId,
				status: 'ACCEPTED'
			}
		]);
	});

	afterAll(async () => {
		if (!testDatabase) {
			return;
		}

		const jobIds = [baristaJobId, tutorJobId, hiddenJobId, filledJobId];

		await testDatabase
			.delete(schema.applications)
			.where(inArray(schema.applications.jobId, jobIds));
		await testDatabase.delete(schema.jobs).where(inArray(schema.jobs.id, jobIds));
		await testDatabase.delete(schema.categories).where(eq(schema.categories.id, categoryId));
		await testDatabase
			.delete(schema.employerProfiles)
			.where(inArray(schema.employerProfiles.userId, [verifiedEmployerId, unverifiedEmployerId]));
		await testDatabase
			.delete(schema.users)
			.where(inArray(schema.users.id, [verifiedEmployerId, unverifiedEmployerId]));
		await testDatabase.$client.end();
	});

	it('lists the employer jobs newest first with applicant counts', async () => {
		if (!testDatabase) {
			return;
		}

		const page = await listEmployerJobs(testDatabase, {
			employerId: verifiedEmployerId,
			limit: 20,
			offset: 0
		});

		expect(page.total).toBe(3);
		expect(page.items.map((job) => job.id)).toEqual([filledJobId, hiddenJobId, baristaJobId]);

		const barista = page.items.find((job) => job.id === baristaJobId);

		expect(barista).toMatchObject({
			applicantCount: 1,
			acceptedCount: 0,
			isHidden: false,
			hiddenReason: null,
			employerOrgName: 'Verified Coffee'
		});
	});

	it('filters the employer jobs by status', async () => {
		if (!testDatabase) {
			return;
		}

		const page = await listEmployerJobs(testDatabase, {
			employerId: verifiedEmployerId,
			status: 'FILLED',
			limit: 20,
			offset: 0
		});

		expect(page.total).toBe(1);
		expect(page.items[0]?.id).toBe(filledJobId);
	});

	it('returns only open, visible jobs from search', async () => {
		if (!testDatabase) {
			return;
		}

		const page = await searchOpenJobs(testDatabase, {
			...defaultFilters,
			categoryId
		});

		expect(page.total).toBe(2);
		expect(page.items.map((job) => job.id)).toEqual([tutorJobId, baristaJobId]);
	});

	it('matches keywords against title and description', async () => {
		if (!testDatabase) {
			return;
		}

		const byTitle = await searchOpenJobs(testDatabase, {
			...defaultFilters,
			categoryId,
			query: 'barista'
		});
		const byDescription = await searchOpenJobs(testDatabase, {
			...defaultFilters,
			categoryId,
			query: 'algebra'
		});

		expect(byTitle.items.map((job) => job.id)).toEqual([baristaJobId]);
		expect(byDescription.items.map((job) => job.id)).toEqual([tutorJobId]);
	});

	it('matches the location as a literal substring', async () => {
		if (!testDatabase) {
			return;
		}

		const hanoi = await searchOpenJobs(testDatabase, {
			...defaultFilters,
			categoryId,
			location: 'hanoi'
		});
		const wildcard = await searchOpenJobs(testDatabase, {
			...defaultFilters,
			categoryId,
			location: '%'
		});

		expect(hanoi.items.map((job) => job.id)).toEqual([baristaJobId]);
		expect(wildcard.total).toBe(0);
	});

	it('filters by salary range and sorts by salary', async () => {
		if (!testDatabase) {
			return;
		}

		const range = await searchOpenJobs(testDatabase, {
			...defaultFilters,
			categoryId,
			salaryMin: 50_000
		});
		const sorted = await searchOpenJobs(testDatabase, {
			...defaultFilters,
			categoryId,
			sort: 'salary_desc'
		});

		expect(range.items.map((job) => job.id)).toEqual([tutorJobId]);
		expect(sorted.items.map((job) => job.id)).toEqual([tutorJobId, baristaJobId]);
	});

	it('filters by verified employers only', async () => {
		if (!testDatabase) {
			return;
		}

		const page = await searchOpenJobs(testDatabase, {
			...defaultFilters,
			categoryId,
			verifiedOnly: true
		});

		expect(page.items.map((job) => job.id)).toEqual([baristaJobId]);
		expect(page.items[0]?.employerVerificationStatus).toBe('VERIFIED');
	});

	it('finds a hidden job by id and reports its state', async () => {
		if (!testDatabase) {
			return;
		}

		const hidden = await findJobDetail(testDatabase, hiddenJobId);

		expect(hidden).toMatchObject({
			id: hiddenJobId,
			isHidden: true,
			description: 'Reported by students.',
			schedule: 'Evenings',
			status: 'HIRING'
		});

		await expect(findJobDetail(testDatabase, randomUUID())).resolves.toBeNull();
	});
});
