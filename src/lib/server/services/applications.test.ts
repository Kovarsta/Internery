import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import type { Storage } from '#lib/server/storage/client.ts';
import { saveCv } from './cv.ts';
import {
	acceptApplication,
	applyToJob,
	getApplicantProfile,
	getApplicationCv,
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

// The race test needs two connections that can hold a transaction at the same
// time; the shared client above is limited to one.
const concurrentDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 4 }), { schema })
	: null;

const studentId = randomUUID();
const writerStudentId = randomUUID();
const secondStudentId = randomUUID();
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
const acceptJobId = randomUUID();
const fullJobId = randomUUID();
const raceJobId = randomUUID();
const cvRaceJobId = randomUUID();

const firstApplicationId = randomUUID();
const secondApplicationId = randomUUID();
const profileApplicationId = randomUUID();
const rejectApplicationId = randomUUID();
const acceptFirstApplicationId = randomUUID();
const acceptSecondApplicationId = randomUUID();
const fullAcceptedApplicationId = randomUUID();
const fullPendingApplicationId = randomUUID();
const raceFirstApplicationId = randomUUID();
const raceSecondApplicationId = randomUUID();

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
				id: secondStudentId,
				name: 'Second Student',
				email: `${secondStudentId}@example.com`,
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
				job(acceptJobId, 'Accept job'),
				job(fullJobId, 'Full job'),
				job(raceJobId, 'Race job'),
				job(cvRaceJobId, 'CV race job'),
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
				cvFileName: 'first.pdf',
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
				cvKey: 'cv/writer.pdf',
				cvFileName: 'writer.pdf'
			},
			{
				id: rejectApplicationId,
				jobId: rejectJobId,
				studentId: writerStudentId,
				message: 'Please consider me.',
				status: 'PENDING'
			},
			{
				id: acceptFirstApplicationId,
				jobId: acceptJobId,
				studentId: writerStudentId,
				message: 'Want the last position.',
				status: 'PENDING'
			},
			{
				id: acceptSecondApplicationId,
				jobId: acceptJobId,
				studentId: secondStudentId,
				message: 'Also interested.',
				status: 'PENDING'
			},
			{
				id: fullAcceptedApplicationId,
				jobId: fullJobId,
				studentId: writerStudentId,
				status: 'ACCEPTED'
			},
			{
				id: fullPendingApplicationId,
				jobId: fullJobId,
				studentId: secondStudentId,
				status: 'PENDING'
			},
			{
				id: raceFirstApplicationId,
				jobId: raceJobId,
				studentId: writerStudentId,
				status: 'PENDING'
			},
			{
				id: raceSecondApplicationId,
				jobId: raceJobId,
				studentId: secondStudentId,
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
			.where(
				inArray(schema.users.id, [
					studentId,
					writerStudentId,
					secondStudentId,
					employerId,
					otherEmployerId
				])
			);
		await testDatabase.$client.end();

		if (concurrentDatabase) {
			await concurrentDatabase.$client.end();
		}
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

	describe('acceptApplication', () => {
		it('accepts the last position and fills the job', async () => {
			if (!testDatabase) {
				return;
			}

			const { application, jobFilled } = await acceptApplication(
				testDatabase,
				employerId,
				acceptFirstApplicationId
			);

			expect(jobFilled).toBe(true);
			expect(application.status).toBe('ACCEPTED');
			expect(application.decidedAt).not.toBeNull();

			const [job] = await testDatabase
				.select({ status: schema.jobs.status })
				.from(schema.jobs)
				.where(eq(schema.jobs.id, acceptJobId));

			expect(job?.status).toBe('FILLED');

			const notifications = await testDatabase
				.select({
					userId: schema.notifications.userId,
					type: schema.notifications.type
				})
				.from(schema.notifications)
				.where(eq(schema.notifications.jobId, acceptJobId));

			expect(notifications).toEqual(
				expect.arrayContaining([
					{ userId: writerStudentId, type: 'APPLICATION_ACCEPTED' },
					{ userId: secondStudentId, type: 'JOB_FILLED' }
				])
			);
		});

		it('refuses an application that is no longer pending', async () => {
			if (!testDatabase) {
				return;
			}

			await expect(
				acceptApplication(testDatabase, employerId, rejectApplicationId)
			).rejects.toMatchObject({ code: 'INVALID_STATE_TRANSITION' });
		});

		it('refuses when the job is no longer hiring', async () => {
			if (!testDatabase) {
				return;
			}

			await expect(
				acceptApplication(testDatabase, employerId, acceptSecondApplicationId)
			).rejects.toMatchObject({ code: 'JOB_NOT_HIRING' });
		});

		it('refuses when the positions are full', async () => {
			if (!testDatabase) {
				return;
			}

			await expect(
				acceptApplication(testDatabase, employerId, fullPendingApplicationId)
			).rejects.toMatchObject({ code: 'POSITIONS_FULL' });
		});

		it('refuses another employer and an unknown application', async () => {
			if (!testDatabase) {
				return;
			}

			await expect(
				acceptApplication(testDatabase, otherEmployerId, fullPendingApplicationId)
			).rejects.toMatchObject({ code: 'FORBIDDEN' });

			await expect(acceptApplication(testDatabase, employerId, randomUUID())).rejects.toMatchObject(
				{ code: 'NOT_FOUND' }
			);
		});

		it('accepts only one of two applications racing for the last position', async () => {
			if (!concurrentDatabase) {
				return;
			}

			const results = await Promise.allSettled([
				acceptApplication(concurrentDatabase, employerId, raceFirstApplicationId),
				acceptApplication(concurrentDatabase, employerId, raceSecondApplicationId)
			]);

			const fulfilled = results.filter((result) => result.status === 'fulfilled');
			const rejected = results.filter((result) => result.status === 'rejected');

			expect(fulfilled).toHaveLength(1);
			expect(rejected).toHaveLength(1);

			// The loser can fail on the capacity check or, if it got the lock
			// after the job flipped, on the job status. Both are correct.
			const rejection = rejected[0];

			if (rejection?.status === 'rejected') {
				expect(['JOB_NOT_HIRING', 'POSITIONS_FULL']).toContain(rejection.reason.code);
			}

			const accepted = await concurrentDatabase
				.select({ id: schema.applications.id })
				.from(schema.applications)
				.where(
					and(eq(schema.applications.jobId, raceJobId), eq(schema.applications.status, 'ACCEPTED'))
				);

			expect(accepted).toHaveLength(1);

			const [job] = await concurrentDatabase
				.select({ status: schema.jobs.status })
				.from(schema.jobs)
				.where(eq(schema.jobs.id, raceJobId));

			expect(job?.status).toBe('FILLED');
		});
	});

	describe('getApplicationCv', () => {
		it('returns the snapshot to the employer who owns the job', async () => {
			if (!testDatabase) {
				return;
			}

			await expect(
				getApplicationCv(testDatabase, { id: employerId, role: 'EMPLOYER' }, firstApplicationId)
			).resolves.toEqual({ key: 'cv/first.pdf', fileName: 'first.pdf' });
		});

		it('returns the snapshot to the student who applied', async () => {
			if (!testDatabase) {
				return;
			}

			await expect(
				getApplicationCv(testDatabase, { id: studentId, role: 'STUDENT' }, firstApplicationId)
			).resolves.toEqual({ key: 'cv/first.pdf', fileName: 'first.pdf' });
		});

		it('refuses another employer and another student', async () => {
			if (!testDatabase) {
				return;
			}

			await expect(
				getApplicationCv(
					testDatabase,
					{ id: otherEmployerId, role: 'EMPLOYER' },
					firstApplicationId
				)
			).rejects.toMatchObject({ code: 'FORBIDDEN' });

			await expect(
				getApplicationCv(testDatabase, { id: writerStudentId, role: 'STUDENT' }, firstApplicationId)
			).rejects.toMatchObject({ code: 'FORBIDDEN' });
		});

		it('refuses an application without a CV and an unknown id', async () => {
			if (!testDatabase) {
				return;
			}

			await expect(
				getApplicationCv(testDatabase, { id: employerId, role: 'EMPLOYER' }, rejectApplicationId)
			).rejects.toMatchObject({ code: 'NOT_FOUND' });

			await expect(
				getApplicationCv(testDatabase, { id: employerId, role: 'EMPLOYER' }, randomUUID())
			).rejects.toMatchObject({ code: 'NOT_FOUND' });
		});
	});

	describe('applyToJob with a concurrent CV replacement', () => {
		it('snapshots the old or the new key and leaves the new one current', async () => {
			if (!concurrentDatabase) {
				return;
			}

			const objects = new Map<string, Uint8Array>();
			const fakeStorage: Storage = {
				async putObject(key, body) {
					objects.set(key, body);
				},
				async getObject() {
					return null;
				},
				async deleteObject(key) {
					objects.delete(key);
				}
			};

			const replacement = {
				bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
				fileName: 'replacement.pdf',
				mimeType: 'application/pdf' as const,
				extension: 'pdf' as const
			};

			const [, application] = await Promise.all([
				saveCv(concurrentDatabase, fakeStorage, writerStudentId, replacement),
				applyToJob(
					concurrentDatabase,
					{ id: writerStudentId, name: 'Writer Student' },
					cvRaceJobId,
					{ message: 'CV race', attachCv: true }
				)
			]);

			const [profile] = await concurrentDatabase
				.select({ cvKey: schema.studentProfiles.cvKey })
				.from(schema.studentProfiles)
				.where(eq(schema.studentProfiles.userId, writerStudentId));

			if (!profile?.cvKey) {
				throw new Error('Expected the replacement CV to be stored.');
			}

			expect(profile.cvKey.startsWith(`cv/${writerStudentId}/`)).toBe(true);
			expect(objects.has(profile.cvKey)).toBe(true);
			expect(['cv/writer.pdf', profile.cvKey]).toContain(application.cvKey);
		});
	});
});
