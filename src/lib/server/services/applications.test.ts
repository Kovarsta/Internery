import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import {
	applyToJob,
	getApplicantProfile,
	listJobApplicants,
	listMyApplications,
	rejectApplication,
	withdrawApplication
} from './applications.ts';

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

const studentId = randomUUID();
const writerStudentId = randomUUID();
const employerId = randomUUID();
const otherEmployerId = randomUUID();
const categoryId = randomUUID();

const firstJobId = randomUUID();
const secondJobId = randomUUID();
const profileJobId = randomUUID();
const applyJobId = randomUUID();
const duplicateJobId = randomUUID();
const filledJobId = randomUUID();
const hiddenJobId = randomUUID();
const rejectJobId = randomUUID();

const firstApplicationId = randomUUID();
const secondApplicationId = randomUUID();
const profileApplicationId = randomUUID();
const rejectApplicationId = randomUUID();

describe.skipIf(!testDatabase)('applications', () => {
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
				id: writerStudentId,
				name: 'Writer Student',
				email: `${writerStudentId}@example.com`,
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
			},
			{
				id: otherEmployerId,
				name: 'Other Employer',
				email: `${otherEmployerId}@example.com`,
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

		await testDatabase.insert(schema.studentProfiles).values({
			userId: writerStudentId,
			university: 'VNU',
			major: 'Computer Science',
			skills: ['TypeScript'],
			cvKey: 'cv/writer.pdf',
			cvFileName: 'writer.pdf',
			cvMimeType: 'application/pdf',
			cvSizeBytes: 1024
		});

		const job = (id: string, title: string) => ({
			id,
			employerId,
			categoryId,
			title,
			description: `${title} fixture.`,
			location: 'Hanoi',
			schedule: 'Mornings',
			salaryAmount: 30_000,
			salaryType: 'HOURLY' as const,
			startDate: '2026-11-01',
			endDate: '2026-11-30',
			positionsNeeded: 1
		});

		await testDatabase
			.insert(schema.jobs)
			.values([
				job(firstJobId, 'First job'),
				job(secondJobId, 'Second job'),
				job(profileJobId, 'Profile job'),
				job(applyJobId, 'Apply job'),
				job(duplicateJobId, 'Duplicate job'),
				job(rejectJobId, 'Reject job'),
				{ ...job(filledJobId, 'Filled job'), status: 'FILLED' },
				{ ...job(hiddenJobId, 'Hidden job'), isHidden: true }
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
			},
			{
				id: profileApplicationId,
				jobId: profileJobId,
				studentId: writerStudentId,
				message: 'Profile application',
				status: 'PENDING',
				cvKey: 'cv/writer.pdf'
			},
			{
				id: rejectApplicationId,
				jobId: rejectJobId,
				studentId: writerStudentId,
				message: 'Please consider me.',
				status: 'PENDING'
			}
		]);
	});

	afterAll(async () => {
		if (!testDatabase) {
			return;
		}

		// Deleting the jobs cascades their applications.
		await testDatabase
			.delete(schema.jobs)
			.where(inArray(schema.jobs.employerId, [employerId, otherEmployerId]));
		await testDatabase.delete(schema.categories).where(eq(schema.categories.id, categoryId));
		await testDatabase
			.delete(schema.employerProfiles)
			.where(inArray(schema.employerProfiles.userId, [employerId, otherEmployerId]));
		await testDatabase
			.delete(schema.users)
			.where(inArray(schema.users.id, [studentId, writerStudentId, employerId, otherEmployerId]));
		await testDatabase.$client.end();
	});

	describe('listMyApplications', () => {
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

	describe('listJobApplicants', () => {
		it('lists the applicants of an own job with their student summary', async () => {
			if (!testDatabase) {
				return;
			}

			const page = await listJobApplicants(testDatabase, {
				employerId,
				jobId: firstJobId,
				limit: 20,
				offset: 0
			});

			expect(page.total).toBe(1);
			expect(page.items[0]).toMatchObject({
				id: firstApplicationId,
				status: 'PENDING',
				message: 'First application',
				cvKey: 'cv/first.pdf',
				studentName: 'Applications Student',
				studentUniversity: null,
				studentRatingAvg: null,
				studentRatingCount: null
			});
		});

		it('filters applicants by status', async () => {
			if (!testDatabase) {
				return;
			}

			const page = await listJobApplicants(testDatabase, {
				employerId,
				jobId: firstJobId,
				status: 'REJECTED',
				limit: 20,
				offset: 0
			});

			expect(page).toEqual({ items: [], total: 0 });
		});

		it('refuses another employer and an unknown job', async () => {
			if (!testDatabase) {
				return;
			}

			await expect(
				listJobApplicants(testDatabase, {
					employerId: otherEmployerId,
					jobId: firstJobId,
					limit: 20,
					offset: 0
				})
			).rejects.toMatchObject({ code: 'FORBIDDEN' });

			await expect(
				listJobApplicants(testDatabase, {
					employerId,
					jobId: randomUUID(),
					limit: 20,
					offset: 0
				})
			).rejects.toMatchObject({ code: 'NOT_FOUND' });
		});
	});

	describe('getApplicantProfile', () => {
		it('returns the applicant profile to the job owner', async () => {
			if (!testDatabase) {
				return;
			}

			const result = await getApplicantProfile(testDatabase, employerId, profileApplicationId);

			expect(result.student).toEqual({ id: writerStudentId, name: 'Writer Student' });
			expect(result.profile).toMatchObject({
				university: 'VNU',
				major: 'Computer Science',
				cvKey: 'cv/writer.pdf'
			});
		});

		it('returns a missing profile as null', async () => {
			if (!testDatabase) {
				return;
			}

			const result = await getApplicantProfile(testDatabase, employerId, firstApplicationId);

			expect(result.student.name).toBe('Applications Student');
			expect(result.profile).toBeNull();
		});

		it('refuses another employer and an unknown application', async () => {
			if (!testDatabase) {
				return;
			}

			await expect(
				getApplicantProfile(testDatabase, otherEmployerId, profileApplicationId)
			).rejects.toMatchObject({ code: 'FORBIDDEN' });

			await expect(
				getApplicantProfile(testDatabase, employerId, randomUUID())
			).rejects.toMatchObject({ code: 'NOT_FOUND' });
		});
	});

	describe('applyToJob', () => {
		it('creates a pending application with a CV snapshot and notifies the employer', async () => {
			if (!testDatabase) {
				return;
			}

			const application = await applyToJob(
				testDatabase,
				{ id: writerStudentId, name: 'Writer Student' },
				applyJobId,
				{ message: 'I can start next week.', attachCv: true }
			);

			expect(application).toMatchObject({
				jobId: applyJobId,
				jobTitle: 'Apply job',
				status: 'PENDING',
				message: 'I can start next week.',
				rejectReason: null,
				decidedAt: null,
				cvKey: 'cv/writer.pdf'
			});

			const [notification] = await testDatabase
				.select({
					type: schema.notifications.type,
					applicationId: schema.notifications.applicationId
				})
				.from(schema.notifications)
				.where(
					and(
						eq(schema.notifications.userId, employerId),
						eq(schema.notifications.applicationId, application.id)
					)
				);

			expect(notification?.type).toBe('APPLICATION_RECEIVED');
		});

		it('refuses a second application to the same job', async () => {
			if (!testDatabase) {
				return;
			}

			const student = { id: writerStudentId, name: 'Writer Student' };

			await applyToJob(testDatabase, student, duplicateJobId, {
				message: null,
				attachCv: false
			});

			await expect(
				applyToJob(testDatabase, student, duplicateJobId, {
					message: null,
					attachCv: false
				})
			).rejects.toMatchObject({ code: 'ALREADY_APPLIED' });
		});

		it('refuses a closed or hidden job', async () => {
			if (!testDatabase) {
				return;
			}

			const student = { id: writerStudentId, name: 'Writer Student' };

			await expect(
				applyToJob(testDatabase, student, filledJobId, { message: null, attachCv: false })
			).rejects.toMatchObject({ code: 'JOB_NOT_HIRING' });

			await expect(
				applyToJob(testDatabase, student, hiddenJobId, { message: null, attachCv: false })
			).rejects.toMatchObject({ code: 'NOT_FOUND' });

			await expect(
				applyToJob(testDatabase, student, randomUUID(), { message: null, attachCv: false })
			).rejects.toMatchObject({ code: 'NOT_FOUND' });
		});
	});

	describe('withdrawApplication', () => {
		it('withdraws a pending application and notifies the employer', async () => {
			if (!testDatabase) {
				return;
			}

			const application = await withdrawApplication(
				testDatabase,
				writerStudentId,
				profileApplicationId
			);

			expect(application.status).toBe('WITHDRAWN');
			expect(application.decidedAt).not.toBeNull();

			const [notification] = await testDatabase
				.select({ type: schema.notifications.type })
				.from(schema.notifications)
				.where(
					and(
						eq(schema.notifications.userId, employerId),
						eq(schema.notifications.applicationId, profileApplicationId)
					)
				);

			expect(notification?.type).toBe('APPLICATION_WITHDRAWN');
		});

		it('refuses to withdraw anything that is no longer pending', async () => {
			if (!testDatabase) {
				return;
			}

			await expect(
				withdrawApplication(testDatabase, writerStudentId, profileApplicationId)
			).rejects.toMatchObject({ code: 'INVALID_STATE_TRANSITION' });
		});

		it('refuses another student and an unknown application', async () => {
			if (!testDatabase) {
				return;
			}

			await expect(
				withdrawApplication(testDatabase, studentId, profileApplicationId)
			).rejects.toMatchObject({ code: 'FORBIDDEN' });

			await expect(
				withdrawApplication(testDatabase, writerStudentId, randomUUID())
			).rejects.toMatchObject({ code: 'NOT_FOUND' });
		});

		it('lets the student apply again after withdrawing', async () => {
			if (!testDatabase) {
				return;
			}

			const revived = await applyToJob(
				testDatabase,
				{ id: writerStudentId, name: 'Writer Student' },
				profileJobId,
				{ message: 'I am available again.', attachCv: false }
			);

			expect(revived).toMatchObject({
				id: profileApplicationId,
				status: 'PENDING',
				message: 'I am available again.',
				rejectReason: null,
				decidedAt: null
			});
		});
	});

	describe('rejectApplication', () => {
		it('rejects a pending application and notifies the student', async () => {
			if (!testDatabase) {
				return;
			}

			const application = await rejectApplication(
				testDatabase,
				employerId,
				rejectApplicationId,
				'The position was filled.'
			);

			expect(application.status).toBe('REJECTED');
			expect(application.rejectReason).toBe('The position was filled.');
			expect(application.decidedAt).not.toBeNull();

			const [notification] = await testDatabase
				.select({
					type: schema.notifications.type,
					body: schema.notifications.body
				})
				.from(schema.notifications)
				.where(
					and(
						eq(schema.notifications.userId, writerStudentId),
						eq(schema.notifications.applicationId, rejectApplicationId)
					)
				);

			expect(notification?.type).toBe('APPLICATION_REJECTED');
			expect(notification?.body).toBe('The position was filled.');
		});

		it('refuses an application that is not pending', async () => {
			if (!testDatabase) {
				return;
			}

			await expect(
				rejectApplication(testDatabase, employerId, secondApplicationId, null)
			).rejects.toMatchObject({ code: 'INVALID_STATE_TRANSITION' });
		});

		it('refuses another employer and an unknown application', async () => {
			if (!testDatabase) {
				return;
			}

			await expect(
				rejectApplication(testDatabase, otherEmployerId, rejectApplicationId, null)
			).rejects.toMatchObject({ code: 'FORBIDDEN' });

			await expect(
				rejectApplication(testDatabase, employerId, randomUUID(), null)
			).rejects.toMatchObject({ code: 'NOT_FOUND' });
		});
	});
});
