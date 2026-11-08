import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import { listSavedJobs, saveJob, unsaveJob } from './saved-jobs.ts';

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

const studentId = randomUUID();
const employerId = randomUUID();
const categoryId = randomUUID();
const jobId = randomUUID();

describe.skipIf(!testDatabase)('saved jobs', () => {
	beforeAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.insert(schema.users).values([
			{
				id: studentId,
				name: 'Saved Job Student',
				email: `${studentId}@example.com`,
				emailVerified: true,
				role: 'STUDENT',
				status: 'ACTIVE'
			},
			{
				id: employerId,
				name: 'Saved Job Employer',
				email: `${employerId}@example.com`,
				emailVerified: true,
				role: 'EMPLOYER',
				status: 'ACTIVE'
			}
		]);

		await testDatabase.insert(schema.categories).values({
			id: categoryId,
			name: `Saved jobs ${categoryId}`
		});

		await testDatabase.insert(schema.employerProfiles).values({
			userId: employerId,
			orgName: 'Saved Job Employer',
			orgType: 'COMPANY',
			verificationStatus: 'VERIFIED'
		});

		await testDatabase.insert(schema.jobs).values({
			id: jobId,
			employerId,
			categoryId,
			title: 'Saved job fixture',
			description: 'Fixture used by the saved-jobs service test.',
			location: 'Hanoi',
			daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
			startTime: '06:00',
			endTime: '10:00',
			salaryAmount: 30_000,
			salaryType: 'HOURLY',
			startDate: '2026-11-01',
			endDate: '2026-11-30',
			positionsNeeded: 1
		});
	});

	afterAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.delete(schema.jobs).where(eq(schema.jobs.id, jobId));
		await testDatabase.delete(schema.categories).where(eq(schema.categories.id, categoryId));
		await testDatabase.delete(schema.users).where(eq(schema.users.id, studentId));
		await testDatabase.delete(schema.users).where(eq(schema.users.id, employerId));
		await testDatabase.$client.end();
	});

	it('saves a job, is idempotent and lists it', async () => {
		if (!testDatabase) {
			return;
		}

		await saveJob(testDatabase, studentId, jobId);
		await saveJob(testDatabase, studentId, jobId);

		await expect(bookmarkOwners(jobId)).resolves.toEqual([studentId]);

		const page = await listSavedJobs(testDatabase, studentId, { limit: 20, offset: 0 });

		expect(page.total).toBe(1);
		expect(page.items).toHaveLength(1);
		expect(page.items[0]).toMatchObject({
			id: jobId,
			title: 'Saved job fixture',
			positionsNeeded: 1,
			acceptedCount: 0,
			status: 'HIRING',
			categoryName: `Saved jobs ${categoryId}`,
			employerId,
			employerOrgName: 'Saved Job Employer',
			employerVerificationStatus: 'VERIFIED'
		});
	});

	it('omits hidden jobs from the list', async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.update(schema.jobs).set({ isHidden: true }).where(eq(schema.jobs.id, jobId));

		const page = await listSavedJobs(testDatabase, studentId, { limit: 20, offset: 0 });

		expect(page).toEqual({ items: [], total: 0 });

		await testDatabase
			.update(schema.jobs)
			.set({ isHidden: false })
			.where(eq(schema.jobs.id, jobId));
	});

	it('removes a bookmark and is idempotent', async () => {
		if (!testDatabase) {
			return;
		}

		await unsaveJob(testDatabase, studentId, jobId);
		await unsaveJob(testDatabase, studentId, jobId);

		await expect(bookmarkOwners(jobId)).resolves.toEqual([]);
	});

	it('only removes the calling user bookmark', async () => {
		if (!testDatabase) {
			return;
		}

		await saveJob(testDatabase, employerId, jobId);
		await unsaveJob(testDatabase, studentId, jobId);

		await expect(bookmarkOwners(jobId)).resolves.toEqual([employerId]);

		await unsaveJob(testDatabase, employerId, jobId);
	});

	it('rejects an unknown job', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(saveJob(testDatabase, studentId, randomUUID())).rejects.toMatchObject({
			code: 'NOT_FOUND'
		});
	});
});

async function bookmarkOwners(jobId: string): Promise<string[]> {
	if (!testDatabase) {
		return [];
	}

	const rows = await testDatabase
		.select({ userId: schema.savedJobs.userId })
		.from(schema.savedJobs)
		.where(eq(schema.savedJobs.jobId, jobId));

	return rows.map((row) => row.userId);
}
