import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import {
	cancelJob,
	completeJob,
	createJob,
	deleteJob,
	findJobDetail,
	listEmployerJobs,
	searchOpenJobs,
	updateJob,
	type NewJobInput
} from './jobs.ts';

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

const verifiedEmployerId = randomUUID();
const unverifiedEmployerId = randomUUID();
const categoryId = randomUUID();
const draftCategoryId = randomUUID();
const inactiveCategoryId = randomUUID();
const lifecycleCategoryId = randomUUID();

const baristaJobId = randomUUID();
const tutorJobId = randomUUID();
const hiddenJobId = randomUUID();
const filledJobId = randomUUID();
const cancelJobId = randomUUID();
const cancelFilledJobId = randomUUID();
const completeJobId = randomUUID();
const completedJobId = randomUUID();

const defaultFilters = {
	verifiedOnly: false,
	sort: 'newest' as const,
	limit: 20,
	offset: 0
};

describe.skipIf(!testDatabase)('jobs', () => {
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

		await testDatabase.insert(schema.categories).values({
			id: draftCategoryId,
			name: `Job creation ${draftCategoryId}`
		});

		await testDatabase.insert(schema.categories).values({
			id: inactiveCategoryId,
			name: `Inactive ${inactiveCategoryId}`,
			isActive: false
		});

		await testDatabase.insert(schema.categories).values({
			id: lifecycleCategoryId,
			name: `Lifecycle ${lifecycleCategoryId}`
		});

		await testDatabase.insert(schema.jobs).values([
			{
				id: baristaJobId,
				employerId: verifiedEmployerId,
				categoryId,
				title: 'Part-time barista',
				description: 'Serve coffee on weekends.',
				location: 'Hanoi',
				daysOfWeek: ['SATURDAY', 'SUNDAY'],
				startTime: '09:00',
				endTime: '18:00',
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
				daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
				startTime: '18:00',
				endTime: '21:00',
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
				daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
				startTime: '18:00',
				endTime: '21:00',
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
				daysOfWeek: ['SATURDAY', 'SUNDAY'],
				startTime: '09:00',
				endTime: '18:00',
				salaryAmount: 20_000,
				salaryType: 'HOURLY',
				startDate: '2026-10-01',
				endDate: '2026-10-31',
				positionsNeeded: 1,
				status: 'FILLED',
				createdAt: new Date('2026-01-04T00:00:00Z')
			},
			{
				id: cancelJobId,
				employerId: unverifiedEmployerId,
				categoryId: lifecycleCategoryId,
				title: 'Job to cancel',
				description: 'Lifecycle fixture.',
				location: 'Hanoi',
				daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
				startTime: '06:00',
				endTime: '10:00',
				salaryAmount: 30_000,
				salaryType: 'HOURLY',
				startDate: '2026-12-01',
				endDate: '2026-12-20',
				positionsNeeded: 2
			},
			{
				id: cancelFilledJobId,
				employerId: unverifiedEmployerId,
				categoryId: lifecycleCategoryId,
				title: 'Filled job to cancel',
				description: 'Lifecycle fixture.',
				location: 'Hanoi',
				daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
				startTime: '06:00',
				endTime: '10:00',
				salaryAmount: 30_000,
				salaryType: 'HOURLY',
				startDate: '2026-12-01',
				endDate: '2026-12-20',
				positionsNeeded: 1,
				status: 'FILLED'
			},
			{
				id: completeJobId,
				employerId: unverifiedEmployerId,
				categoryId: lifecycleCategoryId,
				title: 'Job to complete',
				description: 'Lifecycle fixture.',
				location: 'Hanoi',
				daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
				startTime: '06:00',
				endTime: '10:00',
				salaryAmount: 30_000,
				salaryType: 'HOURLY',
				startDate: '2026-12-01',
				endDate: '2026-12-20',
				positionsNeeded: 1,
				status: 'FILLED'
			},
			{
				id: completedJobId,
				employerId: unverifiedEmployerId,
				categoryId: lifecycleCategoryId,
				title: 'Completed job',
				description: 'Lifecycle fixture.',
				location: 'Hanoi',
				daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
				startTime: '06:00',
				endTime: '10:00',
				salaryAmount: 30_000,
				salaryType: 'HOURLY',
				startDate: '2026-12-01',
				endDate: '2026-12-20',
				positionsNeeded: 1,
				status: 'COMPLETED'
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
			},
			{
				jobId: cancelJobId,
				studentId: verifiedEmployerId,
				status: 'PENDING'
			},
			{
				jobId: cancelJobId,
				studentId: unverifiedEmployerId,
				status: 'ACCEPTED'
			},
			{
				jobId: completeJobId,
				studentId: verifiedEmployerId,
				status: 'ACCEPTED'
			},
			{
				jobId: completeJobId,
				studentId: unverifiedEmployerId,
				status: 'PENDING'
			}
		]);
	});

	afterAll(async () => {
		if (!testDatabase) {
			return;
		}

		// Deleting the jobs cascades to their applications and saved bookmarks.
		await testDatabase
			.delete(schema.jobs)
			.where(inArray(schema.jobs.employerId, [verifiedEmployerId, unverifiedEmployerId]));
		await testDatabase
			.delete(schema.categories)
			.where(
				inArray(schema.categories.id, [
					categoryId,
					draftCategoryId,
					inactiveCategoryId,
					lifecycleCategoryId
				])
			);
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
			daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
			startTime: '18:00:00',
			endTime: '21:00:00',
			status: 'HIRING'
		});

		await expect(findJobDetail(testDatabase, randomUUID())).resolves.toBeNull();
	});

	it('creates a job that is visible in search immediately', async () => {
		if (!testDatabase) {
			return;
		}

		const job = await createJob(testDatabase, unverifiedEmployerId, {
			title: 'Weekend stock assistant',
			categoryId: draftCategoryId,
			description: 'Arrange shelves on Saturday mornings.',
			location: 'Da Nang',
			daysOfWeek: ['SATURDAY'],
			startTime: '08:00',
			endTime: '12:00',
			salaryAmount: 40_000,
			salaryType: 'HOURLY',
			startDate: '2026-12-01',
			endDate: '2026-12-20',
			positionsNeeded: 2
		});

		expect(job).toMatchObject({
			status: 'HIRING',
			needsReview: false,
			isHidden: false,
			categoryName: `Job creation ${draftCategoryId}`,
			acceptedCount: 0,
			positionsNeeded: 2
		});

		const page = await searchOpenJobs(testDatabase, {
			...defaultFilters,
			categoryId: draftCategoryId
		});

		expect(page.items.map((item) => item.id)).toContain(job.id);
	});

	it('flags scam terms without blocking the post', async () => {
		if (!testDatabase) {
			return;
		}

		const job = await createJob(testDatabase, unverifiedEmployerId, {
			title: 'Việc nhẹ lương cao tại nhà',
			categoryId: draftCategoryId,
			description: 'Chỉ cần đặt cọc 200.000đ để nhận việc.',
			location: 'Hanoi',
			daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
			startTime: '08:00',
			endTime: '17:00',
			salaryAmount: 500_000,
			salaryType: 'DAILY',
			startDate: '2026-12-01',
			endDate: '2026-12-20',
			positionsNeeded: 5
		});

		expect(job.needsReview).toBe(true);

		const [row] = await testDatabase
			.select({ flaggedTerms: schema.jobs.flaggedTerms })
			.from(schema.jobs)
			.where(eq(schema.jobs.id, job.id));

		expect(row?.flaggedTerms).toEqual(expect.arrayContaining(['đặt cọc', 'việc nhẹ lương cao']));

		const page = await searchOpenJobs(testDatabase, {
			...defaultFilters,
			categoryId: draftCategoryId
		});

		expect(page.items.map((item) => item.id)).toContain(job.id);
	});

	it('rejects an inactive category with a field error', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(
			createJob(testDatabase, unverifiedEmployerId, {
				title: 'Stock assistant',
				categoryId: inactiveCategoryId,
				description: 'Arrange shelves.',
				location: 'Hanoi',
				daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
				startTime: '06:00',
				endTime: '10:00',
				salaryAmount: 40_000,
				salaryType: 'HOURLY',
				startDate: '2026-12-01',
				endDate: '2026-12-20',
				positionsNeeded: 1
			})
		).rejects.toMatchObject({
			code: 'VALIDATION_ERROR',
			details: [{ field: 'categoryId' }]
		});
	});

	it('updates an own job and re-runs the scam scan', async () => {
		if (!testDatabase) {
			return;
		}

		const job = await createJob(testDatabase, unverifiedEmployerId, draftJob());

		const updated = await updateJob(testDatabase, unverifiedEmployerId, job.id, {
			title: 'Đặt cọc rồi nhận việc',
			positionsNeeded: 3
		});

		expect(updated.title).toBe('Đặt cọc rồi nhận việc');
		expect(updated.positionsNeeded).toBe(3);
		expect(updated.needsReview).toBe(true);

		const [row] = await testDatabase
			.select({ flaggedTerms: schema.jobs.flaggedTerms })
			.from(schema.jobs)
			.where(eq(schema.jobs.id, job.id));

		expect(row?.flaggedTerms).toEqual(['đặt cọc']);
	});

	it('rejects editing another employer job', async () => {
		if (!testDatabase) {
			return;
		}

		const job = await createJob(testDatabase, unverifiedEmployerId, draftJob());

		await expect(
			updateJob(testDatabase, verifiedEmployerId, job.id, { title: 'Hijacked' })
		).rejects.toMatchObject({ code: 'FORBIDDEN' });
	});

	it('rejects editing a job that is no longer hiring', async () => {
		if (!testDatabase) {
			return;
		}

		const job = await createJob(testDatabase, unverifiedEmployerId, draftJob());

		await testDatabase
			.update(schema.jobs)
			.set({ status: 'FILLED' })
			.where(eq(schema.jobs.id, job.id));

		await expect(
			updateJob(testDatabase, unverifiedEmployerId, job.id, { title: 'Too late' })
		).rejects.toMatchObject({ code: 'INVALID_STATE_TRANSITION' });
	});

	it('checks a partial date update against the stored other side', async () => {
		if (!testDatabase) {
			return;
		}

		const job = await createJob(testDatabase, unverifiedEmployerId, draftJob());

		await expect(
			updateJob(testDatabase, unverifiedEmployerId, job.id, { endDate: '2026-11-01' })
		).rejects.toMatchObject({
			code: 'VALIDATION_ERROR',
			details: [{ field: 'endDate' }]
		});
	});

	it('deletes an own job and cascades its applications', async () => {
		if (!testDatabase) {
			return;
		}

		const job = await createJob(testDatabase, unverifiedEmployerId, draftJob());

		await testDatabase.insert(schema.applications).values({
			jobId: job.id,
			studentId: verifiedEmployerId,
			status: 'PENDING'
		});

		await deleteJob(testDatabase, unverifiedEmployerId, job.id);

		const [row] = await testDatabase
			.select({ id: schema.jobs.id })
			.from(schema.jobs)
			.where(eq(schema.jobs.id, job.id));

		const applications = await testDatabase
			.select({ id: schema.applications.id })
			.from(schema.applications)
			.where(eq(schema.applications.jobId, job.id));

		expect(row).toBeUndefined();
		expect(applications).toEqual([]);
	});

	it('refuses to delete a job with an accepted application', async () => {
		if (!testDatabase) {
			return;
		}

		const job = await createJob(testDatabase, unverifiedEmployerId, draftJob());

		await testDatabase.insert(schema.applications).values({
			jobId: job.id,
			studentId: verifiedEmployerId,
			status: 'ACCEPTED'
		});

		await expect(deleteJob(testDatabase, unverifiedEmployerId, job.id)).rejects.toMatchObject({
			code: 'JOB_HAS_ACCEPTED_APPLICANTS'
		});

		const [row] = await testDatabase
			.select({ id: schema.jobs.id })
			.from(schema.jobs)
			.where(eq(schema.jobs.id, job.id));

		expect(row?.id).toBe(job.id);
	});

	it('rejects deleting another employer job', async () => {
		if (!testDatabase) {
			return;
		}

		const job = await createJob(testDatabase, unverifiedEmployerId, draftJob());

		await expect(deleteJob(testDatabase, verifiedEmployerId, job.id)).rejects.toMatchObject({
			code: 'FORBIDDEN'
		});
	});

	describe('cancelJob', () => {
		it('cancels a hiring job and notifies pending and accepted students', async () => {
			if (!testDatabase) {
				return;
			}

			const job = await cancelJob(testDatabase, unverifiedEmployerId, cancelJobId);

			expect(job).toMatchObject({ id: cancelJobId, status: 'CANCELLED' });

			const [row] = await testDatabase
				.select({ cancelledAt: schema.jobs.cancelledAt })
				.from(schema.jobs)
				.where(eq(schema.jobs.id, cancelJobId));

			expect(row?.cancelledAt).not.toBeNull();

			const notifications = await testDatabase
				.select({ userId: schema.notifications.userId, type: schema.notifications.type })
				.from(schema.notifications)
				.where(eq(schema.notifications.jobId, cancelJobId));

			expect(notifications).toHaveLength(2);
			expect(notifications.map((entry) => entry.userId).sort()).toEqual(
				[verifiedEmployerId, unverifiedEmployerId].sort()
			);
			expect(notifications.every((entry) => entry.type === 'JOB_CANCELLED')).toBe(true);
		});

		it('cancels a filled job', async () => {
			if (!testDatabase) {
				return;
			}

			const job = await cancelJob(testDatabase, unverifiedEmployerId, cancelFilledJobId);

			expect(job.status).toBe('CANCELLED');
		});

		it('refuses a completed job', async () => {
			if (!testDatabase) {
				return;
			}

			await expect(
				cancelJob(testDatabase, unverifiedEmployerId, completedJobId)
			).rejects.toMatchObject({ code: 'INVALID_STATE_TRANSITION' });
		});

		it('refuses another employer and an unknown job', async () => {
			if (!testDatabase) {
				return;
			}

			await expect(
				cancelJob(testDatabase, verifiedEmployerId, completeJobId)
			).rejects.toMatchObject({ code: 'FORBIDDEN' });

			await expect(
				cancelJob(testDatabase, unverifiedEmployerId, randomUUID())
			).rejects.toMatchObject({ code: 'NOT_FOUND' });
		});
	});

	describe('completeJob', () => {
		it('completes a filled job and notifies accepted students only', async () => {
			if (!testDatabase) {
				return;
			}

			const job = await completeJob(testDatabase, unverifiedEmployerId, completeJobId);

			expect(job.status).toBe('COMPLETED');

			const [row] = await testDatabase
				.select({ completedAt: schema.jobs.completedAt })
				.from(schema.jobs)
				.where(eq(schema.jobs.id, completeJobId));

			expect(row?.completedAt).not.toBeNull();

			const notifications = await testDatabase
				.select({ userId: schema.notifications.userId, type: schema.notifications.type })
				.from(schema.notifications)
				.where(eq(schema.notifications.jobId, completeJobId));

			expect(notifications).toEqual([{ userId: verifiedEmployerId, type: 'JOB_COMPLETED' }]);
		});

		it('refuses a job that is not filled', async () => {
			if (!testDatabase) {
				return;
			}

			await expect(
				completeJob(testDatabase, verifiedEmployerId, baristaJobId)
			).rejects.toMatchObject({ code: 'INVALID_STATE_TRANSITION' });
		});

		it('refuses another employer and an unknown job', async () => {
			if (!testDatabase) {
				return;
			}

			await expect(
				completeJob(testDatabase, verifiedEmployerId, cancelFilledJobId)
			).rejects.toMatchObject({ code: 'FORBIDDEN' });

			await expect(
				completeJob(testDatabase, unverifiedEmployerId, randomUUID())
			).rejects.toMatchObject({ code: 'NOT_FOUND' });
		});
	});
});

/** A clean job used by the write tests so one test cannot affect another. */
function draftJob(): NewJobInput {
	return {
		title: 'Stock assistant',
		categoryId: draftCategoryId,
		description: 'Arrange shelves on Saturday mornings.',
		location: 'Da Nang',
		daysOfWeek: ['SATURDAY'],
		startTime: '08:00',
		endTime: '12:00',
		salaryAmount: 40_000,
		salaryType: 'HOURLY' as const,
		startDate: '2026-12-01',
		endDate: '2026-12-20',
		positionsNeeded: 1
	};
}
