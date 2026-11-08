import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import { submitReport } from './reports.ts';

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

const employerId = randomUUID();
const reporterIds = [randomUUID(), randomUUID(), randomUUID()];
const categoryId = randomUUID();
const jobId = randomUUID();

describe.skipIf(!testDatabase)('submitReport', () => {
	beforeAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.insert(schema.users).values([
			{
				id: employerId,
				name: 'Report Employer',
				email: `report-${employerId}@example.com`,
				emailVerified: true,
				role: 'EMPLOYER',
				status: 'ACTIVE'
			},
			...reporterIds.map((id, index) => ({
				id,
				name: `Reporter ${index}`,
				email: `report-${id}@example.com`,
				emailVerified: true,
				role: 'STUDENT' as const,
				status: 'ACTIVE' as const
			}))
		]);

		await testDatabase.insert(schema.categories).values({
			id: categoryId,
			name: `Report category ${randomUUID()}`
		});

		await testDatabase.insert(schema.jobs).values({
			id: jobId,
			employerId,
			categoryId,
			title: 'Reported job',
			description: 'Created by the reports service test.',
			locationId: '80000000-0000-4000-8000-000000000001',
			daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
			startTime: '18:00',
			endTime: '21:00',
			salaryAmount: 100_000,
			salaryType: 'FIXED',
			startDate: '2026-12-01',
			endDate: '2026-12-02'
		});
	});

	afterAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.delete(schema.notifications).where(eq(schema.notifications.jobId, jobId));
		await testDatabase.delete(schema.reports).where(eq(schema.reports.jobId, jobId));
		await testDatabase.delete(schema.jobs).where(eq(schema.jobs.id, jobId));
		await testDatabase.delete(schema.categories).where(eq(schema.categories.id, categoryId));
		await testDatabase
			.delete(schema.users)
			.where(inArray(schema.users.id, [employerId, ...reporterIds]));
		await testDatabase.$client.end();
	});

	it('hides the job when the third distinct student reports it', async () => {
		if (!testDatabase) {
			return;
		}

		const first = await submitReport(testDatabase, {
			jobId,
			reporterId: reporterIds[0],
			reason: 'The pay is wrong.'
		});
		const second = await submitReport(testDatabase, {
			jobId,
			reporterId: reporterIds[1],
			reason: 'The contact is unreachable.'
		});
		const third = await submitReport(testDatabase, {
			jobId,
			reporterId: reporterIds[2],
			reason: 'They asked for a deposit.'
		});

		expect(first.autoHidden).toBe(false);
		expect(second.autoHidden).toBe(false);
		expect(third.autoHidden).toBe(true);

		const [job] = await testDatabase
			.select({ isHidden: schema.jobs.isHidden, hiddenBy: schema.jobs.hiddenBy })
			.from(schema.jobs)
			.where(eq(schema.jobs.id, jobId));

		expect(job?.isHidden).toBe(true);
		expect(job?.hiddenBy).toBeNull();
	});

	it('refuses a second report from the same student', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(
			submitReport(testDatabase, {
				jobId,
				reporterId: reporterIds[0],
				reason: 'Reporting again.'
			})
		).rejects.toMatchObject({ code: 'ALREADY_REPORTED' });
	});
});
