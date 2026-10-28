import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import { listMyApplications } from './applications.ts';

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

const studentId = randomUUID();
const employerId = randomUUID();
const categoryId = randomUUID();
const firstJobId = randomUUID();
const secondJobId = randomUUID();
const firstApplicationId = randomUUID();
const secondApplicationId = randomUUID();

describe.skipIf(!testDatabase)('listMyApplications', () => {
	beforeAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.insert(schema.users).values([
			{
				id: studentId,
				name: 'Applications Student',
				email: `${studentId}@example.com`,
				emailVerified: true,
				role: 'STUDENT',
				status: 'ACTIVE'
			},
			{
				id: employerId,
				name: 'Applications Employer',
				email: `${employerId}@example.com`,
				emailVerified: true,
				role: 'EMPLOYER',
				status: 'ACTIVE'
			}
		]);

		await testDatabase.insert(schema.categories).values({
			id: categoryId,
			name: `Applications ${categoryId}`
		});

		await testDatabase.insert(schema.employerProfiles).values({
			userId: employerId,
			orgName: 'Acme Applications',
			orgType: 'COMPANY'
		});

		await testDatabase.insert(schema.jobs).values([
			{
				id: firstJobId,
				employerId,
				categoryId,
				title: 'First job',
				description: 'First job fixture.',
				location: 'Hanoi',
				schedule: 'Mornings',
				salaryAmount: 30_000,
				salaryType: 'HOURLY',
				startDate: '2026-11-01',
				endDate: '2026-11-30',
				positionsNeeded: 1
			},
			{
				id: secondJobId,
				employerId,
				categoryId,
				title: 'Second job',
				description: 'Second job fixture.',
				location: 'Hanoi',
				schedule: 'Evenings',
				salaryAmount: 40_000,
				salaryType: 'HOURLY',
				startDate: '2026-11-01',
				endDate: '2026-11-30',
				positionsNeeded: 1
			}
		]);

		await testDatabase.insert(schema.applications).values([
			{
				id: firstApplicationId,
				jobId: firstJobId,
				studentId,
				message: 'First application',
				cvKey: 'cv/first.pdf',
				status: 'PENDING',
				createdAt: new Date('2026-01-01T08:00:00Z')
			},
			{
				id: secondApplicationId,
				jobId: secondJobId,
				studentId,
				message: 'Second application',
				status: 'REJECTED',
				rejectReason: 'The position was filled.',
				decidedAt: new Date('2026-02-02T08:00:00Z'),
				createdAt: new Date('2026-02-01T08:00:00Z')
			}
		]);
	});

	afterAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.delete(schema.jobs).where(eq(schema.jobs.employerId, employerId));
		await testDatabase.delete(schema.categories).where(eq(schema.categories.id, categoryId));
		await testDatabase.delete(schema.users).where(eq(schema.users.id, studentId));
		await testDatabase.delete(schema.users).where(eq(schema.users.id, employerId));
		await testDatabase.$client.end();
	});

	it('returns the student applications, newest first', async () => {
		if (!testDatabase) {
			return;
		}

		const page = await listMyApplications(testDatabase, {
			studentId,
			limit: 20,
			offset: 0
		});

		expect(page.total).toBe(2);
		expect(page.items).toHaveLength(2);
		expect(page.items[0]).toMatchObject({
			id: secondApplicationId,
			jobId: secondJobId,
			jobTitle: 'Second job',
			employerOrgName: 'Acme Applications',
			employerUserName: 'Applications Employer',
			status: 'REJECTED',
			rejectReason: 'The position was filled.',
			cvKey: null
		});
	});

	it('filters by status', async () => {
		if (!testDatabase) {
			return;
		}

		const page = await listMyApplications(testDatabase, {
			studentId,
			status: 'PENDING',
			limit: 20,
			offset: 0
		});

		expect(page.total).toBe(1);
		expect(page.items[0]).toMatchObject({
			id: firstApplicationId,
			status: 'PENDING',
			cvKey: 'cv/first.pdf'
		});
	});
});
