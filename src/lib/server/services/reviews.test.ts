import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import {
	CURRENT_SIGNATURE_VERSION,
	verifyWorkRecordSignature
} from '#lib/server/work-record-signature.ts';
import { createReview, listReviewsForUser } from './reviews.ts';

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

const testSecret = 'test-work-record-secret';

const revieweeId = randomUUID();
const reviewerOneId = randomUUID();
const reviewerTwoId = randomUUID();
const reviewerThreeId = randomUUID();
const outsiderId = randomUUID();
const categoryId = randomUUID();
const jobId = randomUUID();

describe.skipIf(!testDatabase)('listReviewsForUser', () => {
	beforeAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.insert(schema.users).values([
			{
				id: revieweeId,
				name: 'Reviewed Student',
				email: `${revieweeId}@example.com`,
				emailVerified: true,
				role: 'STUDENT',
				status: 'ACTIVE'
			},
			{
				id: reviewerOneId,
				name: 'Reviewer One',
				email: `${reviewerOneId}@example.com`,
				emailVerified: true,
				role: 'EMPLOYER',
				status: 'ACTIVE'
			},
			{
				id: reviewerTwoId,
				name: 'Reviewer Two',
				email: `${reviewerTwoId}@example.com`,
				emailVerified: true,
				role: 'EMPLOYER',
				status: 'ACTIVE'
			},
			{
				id: reviewerThreeId,
				name: 'Reviewer Three',
				email: `${reviewerThreeId}@example.com`,
				emailVerified: true,
				role: 'EMPLOYER',
				status: 'ACTIVE'
			},
			{
				id: outsiderId,
				name: 'Outsider',
				email: `${outsiderId}@example.com`,
				emailVerified: true,
				role: 'EMPLOYER',
				status: 'ACTIVE'
			}
		]);

		await testDatabase.insert(schema.categories).values({
			id: categoryId,
			name: `Reviews ${categoryId}`
		});

		await testDatabase.insert(schema.jobs).values({
			id: jobId,
			employerId: reviewerOneId,
			categoryId,
			title: 'Reviewed job',
			description: 'Reviewed job fixture.',
			location: 'Hanoi',
			schedule: 'Weekends',
			salaryAmount: 30_000,
			salaryType: 'HOURLY',
			startDate: '2026-01-01',
			endDate: '2026-01-31',
			positionsNeeded: 1,
			status: 'COMPLETED'
		});

		await testDatabase.insert(schema.reviews).values([
			{
				jobId,
				reviewerId: reviewerOneId,
				revieweeId,
				rating: 5,
				comment: 'Excellent work.',
				createdAt: new Date('2026-02-01T08:00:00Z')
			},
			{
				jobId,
				reviewerId: reviewerTwoId,
				revieweeId,
				rating: 3,
				comment: 'Good, arrived late once.',
				createdAt: new Date('2026-02-02T08:00:00Z')
			},
			{
				jobId,
				reviewerId: reviewerThreeId,
				revieweeId,
				rating: 1,
				comment: 'Removed by an admin.',
				isHidden: true,
				createdAt: new Date('2026-02-03T08:00:00Z')
			},
			{
				jobId,
				reviewerId: reviewerOneId,
				revieweeId: outsiderId,
				rating: 2,
				comment: 'Another user review.',
				createdAt: new Date('2026-02-04T08:00:00Z')
			}
		]);
	});

	afterAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.delete(schema.reviews).where(eq(schema.reviews.jobId, jobId));
		await testDatabase.delete(schema.jobs).where(eq(schema.jobs.id, jobId));
		await testDatabase.delete(schema.categories).where(eq(schema.categories.id, categoryId));
		await testDatabase
			.delete(schema.users)
			.where(
				inArray(schema.users.id, [
					revieweeId,
					reviewerOneId,
					reviewerTwoId,
					reviewerThreeId,
					outsiderId
				])
			);
	});

	it('returns visible reviews newest first with the rating summary', async () => {
		if (!testDatabase) {
			return;
		}

		const page = await listReviewsForUser(testDatabase, {
			userId: revieweeId,
			limit: 20,
			offset: 0
		});

		expect(page).not.toBeNull();
		expect(page?.total).toBe(2);
		expect(page?.ratingAvg).toBe(4);
		expect(page?.ratingCount).toBe(2);
		expect(page?.items.map((review) => review.reviewerName)).toEqual([
			'Reviewer Two',
			'Reviewer One'
		]);
	});

	it('excludes hidden reviews from the page and the average', async () => {
		if (!testDatabase) {
			return;
		}

		const page = await listReviewsForUser(testDatabase, {
			userId: revieweeId,
			limit: 20,
			offset: 0
		});

		expect(page?.items.some((review) => review.rating === 1)).toBe(false);
		expect(page?.ratingAvg).toBe(4);
	});

	it('pages the reviews without changing the summary', async () => {
		if (!testDatabase) {
			return;
		}

		const page = await listReviewsForUser(testDatabase, {
			userId: revieweeId,
			limit: 1,
			offset: 0
		});

		expect(page?.items).toHaveLength(1);
		expect(page?.total).toBe(2);
		expect(page?.ratingCount).toBe(2);
	});

	it('returns null for an unknown user', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(
			listReviewsForUser(testDatabase, { userId: randomUUID(), limit: 20, offset: 0 })
		).resolves.toBeNull();
	});
});

const reviewEmployerId = randomUUID();
const reviewStudentId = randomUUID();
const pendingStudentId = randomUUID();
const duplicateStudentId = randomUUID();
const raceEmployerOneId = randomUUID();
const raceEmployerTwoId = randomUUID();
const raceStudentId = randomUUID();
const reviewCategoryId = randomUUID();
const recordJobId = randomUUID();
const duplicateJobId = randomUUID();
const hiringJobId = randomUUID();
const raceJobOneId = randomUUID();
const raceJobTwoId = randomUUID();

const reviewJobIds = [recordJobId, duplicateJobId, hiringJobId, raceJobOneId, raceJobTwoId];

const reviewUserIds = [
	reviewEmployerId,
	reviewStudentId,
	pendingStudentId,
	duplicateStudentId,
	raceEmployerOneId,
	raceEmployerTwoId,
	raceStudentId
];

describe.skipIf(!testDatabase)('createReview', () => {
	beforeAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.insert(schema.users).values([
			{
				id: reviewEmployerId,
				name: 'Review Employer',
				email: `${reviewEmployerId}@example.com`,
				emailVerified: true,
				role: 'EMPLOYER',
				status: 'ACTIVE'
			},
			{
				id: reviewStudentId,
				name: 'Review Student',
				email: `${reviewStudentId}@example.com`,
				emailVerified: true,
				role: 'STUDENT',
				status: 'ACTIVE'
			},
			{
				id: pendingStudentId,
				name: 'Pending Student',
				email: `${pendingStudentId}@example.com`,
				emailVerified: true,
				role: 'STUDENT',
				status: 'ACTIVE'
			},
			{
				id: duplicateStudentId,
				name: 'Duplicate Student',
				email: `${duplicateStudentId}@example.com`,
				emailVerified: true,
				role: 'STUDENT',
				status: 'ACTIVE'
			},
			{
				id: raceEmployerOneId,
				name: 'Race Employer One',
				email: `${raceEmployerOneId}@example.com`,
				emailVerified: true,
				role: 'EMPLOYER',
				status: 'ACTIVE'
			},
			{
				id: raceEmployerTwoId,
				name: 'Race Employer Two',
				email: `${raceEmployerTwoId}@example.com`,
				emailVerified: true,
				role: 'EMPLOYER',
				status: 'ACTIVE'
			},
			{
				id: raceStudentId,
				name: 'Race Student',
				email: `${raceStudentId}@example.com`,
				emailVerified: true,
				role: 'STUDENT',
				status: 'ACTIVE'
			}
		]);

		await testDatabase.insert(schema.employerProfiles).values({
			userId: reviewEmployerId,
			orgName: 'Review Test Co',
			orgType: 'COMPANY'
		});

		await testDatabase
			.insert(schema.studentProfiles)
			.values([{ userId: reviewStudentId }, { userId: raceStudentId }]);

		await testDatabase.insert(schema.categories).values({
			id: reviewCategoryId,
			name: `Review write ${reviewCategoryId}`
		});

		await testDatabase
			.insert(schema.jobs)
			.values([
				reviewJob(recordJobId, reviewEmployerId),
				reviewJob(duplicateJobId, reviewEmployerId),
				reviewJob(raceJobOneId, raceEmployerOneId),
				reviewJob(raceJobTwoId, raceEmployerTwoId),
				{ ...reviewJob(hiringJobId, reviewEmployerId), status: 'HIRING' }
			]);

		await testDatabase.insert(schema.applications).values([
			{ jobId: recordJobId, studentId: reviewStudentId, status: 'ACCEPTED' },
			{ jobId: recordJobId, studentId: pendingStudentId, status: 'PENDING' },
			{ jobId: duplicateJobId, studentId: duplicateStudentId, status: 'ACCEPTED' },
			{ jobId: raceJobOneId, studentId: raceStudentId, status: 'ACCEPTED' },
			{ jobId: raceJobTwoId, studentId: raceStudentId, status: 'ACCEPTED' }
		]);
	});

	afterAll(async () => {
		if (!testDatabase) {
			return;
		}

		// Work records and reviews reference the job and the users with
		// `restrict`, so they have to go before the rows they point at.
		await testDatabase
			.delete(schema.workRecords)
			.where(inArray(schema.workRecords.jobId, reviewJobIds));
		await testDatabase.delete(schema.reviews).where(inArray(schema.reviews.jobId, reviewJobIds));
		await testDatabase.delete(schema.jobs).where(inArray(schema.jobs.id, reviewJobIds));
		await testDatabase.delete(schema.categories).where(eq(schema.categories.id, reviewCategoryId));
		await testDatabase.delete(schema.users).where(inArray(schema.users.id, reviewUserIds));
	});

	it('issues a signed work record when the employer reviews a student', async () => {
		if (!testDatabase) {
			return;
		}

		const { review, workRecordId } = await createReview(testDatabase, testSecret, {
			jobId: recordJobId,
			reviewerId: reviewEmployerId,
			revieweeId: reviewStudentId,
			rating: 4,
			comment: 'Reliable and on time.'
		});

		expect(review).toMatchObject({
			jobId: recordJobId,
			reviewerId: reviewEmployerId,
			reviewerName: 'Review Employer',
			rating: 4,
			comment: 'Reliable and on time.'
		});

		if (!workRecordId) {
			throw new Error('Expected an employer review to issue a work record.');
		}

		const [record] = await testDatabase
			.select()
			.from(schema.workRecords)
			.where(eq(schema.workRecords.id, workRecordId));

		if (!record) {
			throw new Error('Expected the work record to be stored.');
		}

		expect(record.payload).toMatchObject({
			recordId: workRecordId,
			studentName: 'Review Student',
			employerName: 'Review Test Co',
			jobTitle: `Review job ${recordJobId}`,
			rating: 4,
			comment: 'Reliable and on time.'
		});
		expect(record.signatureVersion).toBe(CURRENT_SIGNATURE_VERSION);
		expect(
			verifyWorkRecordSignature(
				record.payload,
				record.signature,
				testSecret,
				record.signatureVersion
			)
		).toBe(true);

		const [studentProfile] = await testDatabase
			.select({
				ratingAvg: schema.studentProfiles.ratingAvg,
				ratingCount: schema.studentProfiles.ratingCount
			})
			.from(schema.studentProfiles)
			.where(eq(schema.studentProfiles.userId, reviewStudentId));

		expect(studentProfile).toEqual({ ratingAvg: 4, ratingCount: 1 });

		const notifications = await testDatabase
			.select({ type: schema.notifications.type })
			.from(schema.notifications)
			.where(
				and(
					eq(schema.notifications.jobId, recordJobId),
					eq(schema.notifications.userId, reviewStudentId)
				)
			);

		expect(notifications.map((entry) => entry.type).sort()).toEqual([
			'REVIEW_RECEIVED',
			'WORK_RECORD_CREATED'
		]);
	});

	it('does not issue a work record when a student reviews the employer', async () => {
		if (!testDatabase) {
			return;
		}

		const { review, workRecordId } = await createReview(testDatabase, testSecret, {
			jobId: recordJobId,
			reviewerId: reviewStudentId,
			revieweeId: reviewEmployerId,
			rating: 5,
			comment: null
		});

		expect(review.reviewerName).toBe('Review Student');
		expect(workRecordId).toBeNull();

		const [employerProfile] = await testDatabase
			.select({
				ratingAvg: schema.employerProfiles.ratingAvg,
				ratingCount: schema.employerProfiles.ratingCount
			})
			.from(schema.employerProfiles)
			.where(eq(schema.employerProfiles.userId, reviewEmployerId));

		expect(employerProfile).toEqual({ ratingAvg: 5, ratingCount: 1 });
	});

	it('refuses a second review of the same person for the same job', async () => {
		if (!testDatabase) {
			return;
		}

		const input = {
			jobId: duplicateJobId,
			reviewerId: reviewEmployerId,
			revieweeId: duplicateStudentId,
			rating: 3,
			comment: null
		};

		await createReview(testDatabase, testSecret, input);

		await expect(createReview(testDatabase, testSecret, input)).rejects.toMatchObject({
			code: 'ALREADY_REVIEWED'
		});
	});

	it('refuses a student who was not accepted for the job', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(
			createReview(testDatabase, testSecret, {
				jobId: recordJobId,
				reviewerId: reviewEmployerId,
				revieweeId: pendingStudentId,
				rating: 4,
				comment: null
			})
		).rejects.toMatchObject({ code: 'NOT_A_PARTICIPANT' });
	});

	it('refuses a reviewer who is not a participant', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(
			createReview(testDatabase, testSecret, {
				jobId: recordJobId,
				reviewerId: outsiderId,
				revieweeId: reviewStudentId,
				rating: 4,
				comment: null
			})
		).rejects.toMatchObject({ code: 'NOT_A_PARTICIPANT' });
	});

	it('refuses a job that is not completed', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(
			createReview(testDatabase, testSecret, {
				jobId: hiringJobId,
				reviewerId: reviewEmployerId,
				revieweeId: reviewStudentId,
				rating: 4,
				comment: null
			})
		).rejects.toMatchObject({ code: 'JOB_NOT_COMPLETED' });
	});

	it('refuses an unknown job', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(
			createReview(testDatabase, testSecret, {
				jobId: randomUUID(),
				reviewerId: reviewEmployerId,
				revieweeId: reviewStudentId,
				rating: 4,
				comment: null
			})
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
	});

	it('keeps both ratings when two employers review the same student at once', async () => {
		if (!concurrentDatabase) {
			return;
		}

		const [fiveStars, threeStars] = await Promise.all([
			createReview(concurrentDatabase, testSecret, {
				jobId: raceJobOneId,
				reviewerId: raceEmployerOneId,
				revieweeId: raceStudentId,
				rating: 5,
				comment: null
			}),
			createReview(concurrentDatabase, testSecret, {
				jobId: raceJobTwoId,
				reviewerId: raceEmployerTwoId,
				revieweeId: raceStudentId,
				rating: 3,
				comment: null
			})
		]);

		expect(fiveStars.workRecordId).not.toBeNull();
		expect(threeStars.workRecordId).not.toBeNull();

		const [studentProfile] = await concurrentDatabase
			.select({
				ratingAvg: schema.studentProfiles.ratingAvg,
				ratingCount: schema.studentProfiles.ratingCount
			})
			.from(schema.studentProfiles)
			.where(eq(schema.studentProfiles.userId, raceStudentId));

		expect(studentProfile).toEqual({ ratingAvg: 4, ratingCount: 2 });
	});
});

/** A completed job that the review tests can attach applications to. */
function reviewJob(id: string, employerId: string): typeof schema.jobs.$inferInsert {
	return {
		id,
		employerId,
		categoryId: reviewCategoryId,
		title: `Review job ${id}`,
		description: 'Review write fixture.',
		location: 'Hanoi',
		schedule: 'Weekends',
		salaryAmount: 30_000,
		salaryType: 'HOURLY',
		startDate: '2026-03-01',
		endDate: '2026-03-31',
		positionsNeeded: 1,
		status: 'COMPLETED'
	};
}

afterAll(async () => {
	if (testDatabase) {
		await testDatabase.$client.end();
	}

	if (concurrentDatabase) {
		await concurrentDatabase.$client.end();
	}
});
