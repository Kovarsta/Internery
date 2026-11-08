import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import {
	findPublicWorkRecord,
	listPublicWorkRecords,
	listStudentWorkRecords
} from './work-records.ts';

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

const studentId = randomUUID();
const employerId = randomUUID();
const categoryId = randomUUID();
const jobId = randomUUID();
const secondJobId = randomUUID();
const reviewId = randomUUID();
const secondReviewId = randomUUID();
const publicRecordId = randomUUID();
const privateRecordId = randomUUID();

describe.skipIf(!testDatabase)('work-record reads', () => {
	beforeAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.insert(schema.users).values([
			{
				id: studentId,
				name: 'Record Student',
				email: `${studentId}@example.com`,
				emailVerified: true,
				role: 'STUDENT',
				status: 'ACTIVE'
			},
			{
				id: employerId,
				name: 'Record Employer',
				email: `${employerId}@example.com`,
				emailVerified: true,
				role: 'EMPLOYER',
				status: 'ACTIVE'
			}
		]);

		await testDatabase.insert(schema.categories).values({
			id: categoryId,
			name: `Records ${categoryId}`
		});

		await testDatabase.insert(schema.jobs).values({
			id: jobId,
			employerId,
			categoryId,
			title: 'Recorded job',
			description: 'Work record fixture.',
			location: 'Hanoi',
			daysOfWeek: ['SATURDAY', 'SUNDAY'],
			startTime: '09:00',
			endTime: '18:00',
			salaryAmount: 30_000,
			salaryType: 'HOURLY',
			startDate: '2026-01-01',
			endDate: '2026-01-31',
			positionsNeeded: 1,
			status: 'COMPLETED'
		});

		await testDatabase.insert(schema.jobs).values({
			id: secondJobId,
			employerId,
			categoryId,
			title: 'Second recorded job',
			description: 'Second work record fixture.',
			location: 'Hanoi',
			daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
			startTime: '18:00',
			endTime: '21:00',
			salaryAmount: 40_000,
			salaryType: 'HOURLY',
			startDate: '2026-03-01',
			endDate: '2026-03-31',
			positionsNeeded: 1,
			status: 'COMPLETED'
		});

		await testDatabase.insert(schema.reviews).values([
			{
				id: reviewId,
				jobId,
				reviewerId: employerId,
				revieweeId: studentId,
				rating: 5,
				comment: 'Excellent work.'
			},
			{
				id: secondReviewId,
				jobId: secondJobId,
				reviewerId: employerId,
				revieweeId: studentId,
				rating: 4,
				comment: null
			}
		]);

		await testDatabase.insert(schema.workRecords).values([
			{
				id: publicRecordId,
				jobId,
				studentId,
				employerId,
				reviewId,
				payload: {
					recordId: publicRecordId,
					studentName: 'Record Student',
					employerName: 'Record Employer',
					jobTitle: 'Recorded job',
					startDate: '2026-01-01',
					endDate: '2026-01-31',
					rating: 5,
					comment: 'Excellent work.',
					issuedAt: '2026-02-01T08:00:00.000Z'
				},
				signature: 'a'.repeat(64),
				isPublic: true,
				publishedAt: new Date('2026-02-02T08:00:00Z'),
				createdAt: new Date('2026-02-01T08:00:00Z')
			},
			{
				id: privateRecordId,
				jobId: secondJobId,
				studentId,
				employerId,
				reviewId: secondReviewId,
				payload: {
					recordId: privateRecordId,
					studentName: 'Record Student',
					employerName: 'Record Employer',
					jobTitle: 'Recorded job',
					startDate: '2026-01-01',
					endDate: '2026-01-31',
					rating: 5,
					comment: null,
					issuedAt: '2026-02-03T08:00:00.000Z'
				},
				signature: 'b'.repeat(64),
				isPublic: false,
				createdAt: new Date('2026-02-03T08:00:00Z')
			}
		]);
	});

	afterAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase
			.delete(schema.workRecords)
			.where(eq(schema.workRecords.studentId, studentId));
		await testDatabase
			.delete(schema.reviews)
			.where(inArray(schema.reviews.id, [reviewId, secondReviewId]));
		await testDatabase.delete(schema.jobs).where(inArray(schema.jobs.id, [jobId, secondJobId]));
		await testDatabase.delete(schema.categories).where(eq(schema.categories.id, categoryId));
		await testDatabase
			.delete(schema.users)
			.where(inArray(schema.users.id, [studentId, employerId]));
		await testDatabase.$client.end();
	});

	it('lists every record of the student, newest first', async () => {
		if (!testDatabase) {
			return;
		}

		const page = await listStudentWorkRecords(testDatabase, studentId, { limit: 20, offset: 0 });

		expect(page.total).toBe(2);
		expect(page.items.map((record) => record.id)).toEqual([privateRecordId, publicRecordId]);
		expect(page.items[1]?.payload.comment).toBe('Excellent work.');
	});

	it('lists only published records in the public directory', async () => {
		if (!testDatabase) {
			return;
		}

		const page = await listPublicWorkRecords(testDatabase, { limit: 20, offset: 0 });

		expect(page.items.map((record) => record.id)).toContain(publicRecordId);
		expect(page.items.map((record) => record.id)).not.toContain(privateRecordId);
	});

	it('finds a public record and refuses a private one', async () => {
		if (!testDatabase) {
			return;
		}

		const publicRecord = await findPublicWorkRecord(testDatabase, publicRecordId);
		const privateRecord = await findPublicWorkRecord(testDatabase, privateRecordId);

		expect(publicRecord?.signature).toBe('a'.repeat(64));
		expect(privateRecord).toBeNull();
	});
});
