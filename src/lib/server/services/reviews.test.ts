import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import { listReviewsForUser } from './reviews.ts';

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

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
		await testDatabase.$client.end();
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
