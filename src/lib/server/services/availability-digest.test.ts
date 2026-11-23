import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import {
	digestSince,
	DIGEST_INTERVAL_DAYS,
	findDigestJobs,
	listDigestCandidates,
	markDigestSent
} from './availability-digest.ts';

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

const studentId = randomUUID();
const employerId = randomUUID();
const categoryId = randomUUID();
const locationId = randomUUID();
const fittingJobId = randomUUID();
const allWeekJobId = randomUUID();
const lateJobId = randomUUID();

describe('digestSince', () => {
	it('reports from the last send', () => {
		const lastSent = new Date('2026-11-01T00:00:00.000Z');

		expect(digestSince(lastSent, new Date('2026-11-10T00:00:00.000Z'))).toBe(lastSent);
	});

	it('looks back one interval when nothing was sent yet', () => {
		const now = new Date('2026-11-10T00:00:00.000Z');
		const since = digestSince(null, now);

		expect(now.getTime() - since.getTime()).toBe(DIGEST_INTERVAL_DAYS * 24 * 60 * 60 * 1000);
	});
});

describe.skipIf(!testDatabase)('availability digest', () => {
	beforeAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.insert(schema.users).values([
			{
				id: studentId,
				name: 'Digest Student',
				email: `${studentId}@example.com`,
				emailVerified: true,
				role: 'STUDENT',
				status: 'ACTIVE'
			},
			{
				id: employerId,
				name: 'Digest Employer',
				email: `${employerId}@example.com`,
				emailVerified: true,
				role: 'EMPLOYER',
				status: 'ACTIVE'
			}
		]);

		await testDatabase.insert(schema.studentProfiles).values({
			userId: studentId,
			major: 'English Language',
			availableDays: ['SATURDAY', 'SUNDAY'],
			availableTimeOfDay: ['MORNING']
		});

		await testDatabase.insert(schema.employerProfiles).values({
			userId: employerId,
			orgName: 'Digest Employer'
		});

		await testDatabase
			.insert(schema.categories)
			.values({ id: categoryId, name: `Digest ${categoryId}` });
		await testDatabase.insert(schema.locations).values({
			id: locationId,
			countryCode: 'VN',
			countryName: 'Vietnam',
			name: 'District 5',
			displayName: 'District 5, Ho Chi Minh City',
			slug: `digest-${locationId}`,
			searchText: 'district 5 ho chi minh city',
			// Keep the shared location-count test unaffected.
			isActive: false
		});

		const recent = new Date(Date.now() - 60 * 60 * 1000);

		await testDatabase.insert(schema.jobs).values([
			{
				id: fittingJobId,
				employerId,
				categoryId,
				title: 'Digest fitting job',
				description: 'Weekend morning shift.',
				locationId,
				daysOfWeek: ['SATURDAY', 'SUNDAY'],
				startTime: '08:00',
				endTime: '12:00',
				salaryAmount: 50_000,
				salaryType: 'HOURLY',
				startDate: '2026-11-01',
				endDate: '2026-11-30',
				createdAt: recent
			},
			{
				id: allWeekJobId,
				employerId,
				categoryId,
				title: 'Digest all-week job',
				description: 'Runs Monday to Saturday.',
				locationId,
				daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
				startTime: '08:00',
				endTime: '12:00',
				salaryAmount: 50_000,
				salaryType: 'HOURLY',
				startDate: '2026-11-01',
				endDate: '2026-11-30',
				createdAt: recent
			},
			{
				id: lateJobId,
				employerId,
				categoryId,
				title: 'Digest late job',
				description: 'Weekend evening shift.',
				locationId,
				daysOfWeek: ['SATURDAY'],
				startTime: '16:00',
				endTime: '22:00',
				salaryAmount: 50_000,
				salaryType: 'HOURLY',
				startDate: '2026-11-01',
				endDate: '2026-11-30',
				createdAt: recent
			}
		]);
	});

	afterAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.delete(schema.jobs).where(eq(schema.jobs.employerId, employerId));
		await testDatabase.delete(schema.users).where(eq(schema.users.id, studentId));
		await testDatabase.delete(schema.users).where(eq(schema.users.id, employerId));
		await testDatabase.delete(schema.categories).where(eq(schema.categories.id, categoryId));
		await testDatabase.delete(schema.locations).where(eq(schema.locations.id, locationId));
		await testDatabase.$client.end();
	});

	it('keeps only jobs whose whole shift fits the free time', async () => {
		if (!testDatabase) {
			return;
		}

		const jobs = await findDigestJobs(
			testDatabase,
			['SATURDAY', 'SUNDAY'],
			['MORNING'],
			digestSince(null, new Date())
		);

		expect(jobs.map((job) => job.id)).toEqual([fittingJobId]);
		expect(jobs[0]?.employerName).toBe('Digest Employer');
	});

	it('lists the student until a digest is recorded', async () => {
		if (!testDatabase) {
			return;
		}

		const before = await listDigestCandidates(testDatabase);

		expect(before.some((candidate) => candidate.studentId === studentId)).toBe(true);

		await markDigestSent(testDatabase, studentId, new Date());

		const after = await listDigestCandidates(testDatabase);

		expect(after.some((candidate) => candidate.studentId === studentId)).toBe(false);
	});
});
