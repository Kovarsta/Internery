import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import {
	expireApplicationCv,
	purgeExpiredSessions,
	purgeExpiredVerifications,
	purgeOldAiExplanations,
	purgeOldAiUsage,
	purgeOldAuditLogs,
	purgeOldNotifications
} from './retention.ts';

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

const NOW = new Date('2026-06-15T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const employerId = randomUUID();
const studentId = randomUUID();
const pendingApplicantId = randomUUID();
const rejectedOldApplicantId = randomUUID();
const rejectedRecentApplicantId = randomUUID();
const withdrawnOldApplicantId = randomUUID();
const acceptedOldApplicantId = randomUUID();
const acceptedRecentApplicantId = randomUUID();

const applicantIds = [
	pendingApplicantId,
	rejectedOldApplicantId,
	rejectedRecentApplicantId,
	withdrawnOldApplicantId,
	acceptedOldApplicantId,
	acceptedRecentApplicantId
];
const categoryId = randomUUID();
const oldJobId = randomUUID();
const recentJobId = randomUUID();
const sessionOldId = randomUUID();
const sessionRecentId = randomUUID();
const verificationOldId = randomUUID();
const verificationRecentId = randomUUID();
const notificationOldId = randomUUID();
const notificationRecentId = randomUUID();
const explanationOldId = randomUUID();
const explanationRecentId = randomUUID();
const auditOldId = randomUUID();
const auditRecentId = randomUUID();
const pendingApplicationId = randomUUID();
const rejectedOldId = randomUUID();
const rejectedRecentId = randomUUID();
const acceptedOldId = randomUUID();
const acceptedRecentId = randomUUID();
const withdrawnOldId = randomUUID();

function daysAgo(days: number): Date {
	return new Date(NOW.getTime() - days * DAY_MS);
}

describe.skipIf(!testDatabase)('retention', () => {
	beforeAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.insert(schema.users).values([
			{
				id: employerId,
				name: 'Retention Employer',
				email: `${employerId}@example.com`,
				emailVerified: true,
				role: 'EMPLOYER',
				status: 'ACTIVE'
			},
			{
				id: studentId,
				name: 'Retention Student',
				email: `${studentId}@example.com`,
				emailVerified: true,
				role: 'STUDENT',
				status: 'ACTIVE'
			},
			...applicantIds.map((id) => ({
				id,
				name: `Retention Applicant ${id}`,
				email: `${id}@example.com`,
				emailVerified: true,
				role: 'STUDENT' as const,
				status: 'ACTIVE' as const
			}))
		]);

		await testDatabase.insert(schema.categories).values({
			id: categoryId,
			name: `Retention ${categoryId}`
		});

		const job = (
			id: string,
			title: string,
			completedAt: Date
		): typeof schema.jobs.$inferInsert => ({
			id,
			employerId,
			categoryId,
			title,
			description: `${title} fixture.`,
			location: 'Hanoi',
			daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
			startTime: '06:00',
			endTime: '10:00',
			salaryAmount: 30_000,
			salaryType: 'HOURLY' as const,
			startDate: '2024-01-01',
			endDate: '2024-02-01',
			positionsNeeded: 1,
			status: 'COMPLETED' as const,
			completedAt
		});

		await testDatabase
			.insert(schema.jobs)
			.values([
				job(oldJobId, 'Old completed job', daysAgo(25 * 30)),
				job(recentJobId, 'Recent completed job', daysAgo(23 * 30))
			]);

		await testDatabase.insert(schema.applications).values([
			{
				id: pendingApplicationId,
				jobId: oldJobId,
				studentId: pendingApplicantId,
				cvKey: `cv/retention/${pendingApplicationId}.pdf`,
				cvFileName: 'pending.pdf',
				status: 'PENDING'
			},
			{
				id: rejectedOldId,
				jobId: oldJobId,
				studentId: rejectedOldApplicantId,
				cvKey: `cv/retention/${rejectedOldId}.pdf`,
				cvFileName: 'rejected-old.pdf',
				status: 'REJECTED',
				decidedAt: daysAgo(7 * 30)
			},
			{
				id: rejectedRecentId,
				jobId: oldJobId,
				studentId: rejectedRecentApplicantId,
				cvKey: `cv/retention/${rejectedRecentId}.pdf`,
				cvFileName: 'rejected-recent.pdf',
				status: 'REJECTED',
				decidedAt: daysAgo(5 * 30)
			},
			{
				id: withdrawnOldId,
				jobId: oldJobId,
				studentId: withdrawnOldApplicantId,
				cvKey: `cv/retention/${withdrawnOldId}.pdf`,
				cvFileName: 'withdrawn-old.pdf',
				status: 'WITHDRAWN',
				decidedAt: daysAgo(7 * 30)
			},
			{
				id: acceptedOldId,
				jobId: oldJobId,
				studentId: acceptedOldApplicantId,
				cvKey: `cv/retention/${acceptedOldId}.pdf`,
				cvFileName: 'accepted-old.pdf',
				status: 'ACCEPTED'
			},
			{
				id: acceptedRecentId,
				jobId: recentJobId,
				studentId: acceptedRecentApplicantId,
				cvKey: `cv/retention/${acceptedRecentId}.pdf`,
				cvFileName: 'accepted-recent.pdf',
				status: 'ACCEPTED'
			}
		]);

		await testDatabase.insert(schema.sessions).values([
			{
				id: sessionOldId,
				token: `old-${randomUUID()}`,
				userId: studentId,
				expiresAt: daysAgo(31),
				updatedAt: NOW
			},
			{
				id: sessionRecentId,
				token: `recent-${randomUUID()}`,
				userId: studentId,
				expiresAt: daysAgo(29),
				updatedAt: NOW
			}
		]);

		await testDatabase.insert(schema.verifications).values([
			{
				id: verificationOldId,
				identifier: `old-${randomUUID()}`,
				value: 'old',
				expiresAt: daysAgo(8)
			},
			{
				id: verificationRecentId,
				identifier: `recent-${randomUUID()}`,
				value: 'recent',
				expiresAt: daysAgo(6)
			}
		]);

		await testDatabase.insert(schema.notifications).values([
			{
				id: notificationOldId,
				userId: studentId,
				type: 'REVIEW_RECEIVED',
				title: 'Old notification',
				createdAt: daysAgo(91)
			},
			{
				id: notificationRecentId,
				userId: studentId,
				type: 'REVIEW_RECEIVED',
				title: 'Recent notification',
				createdAt: daysAgo(89)
			}
		]);

		await testDatabase.insert(schema.aiExplanations).values([
			{
				id: explanationOldId,
				studentId,
				jobId: oldJobId,
				cvHash: randomUUID(),
				verdict: 'FIT',
				reasons: [],
				model: 'test-model',
				createdAt: daysAgo(31)
			},
			{
				id: explanationRecentId,
				studentId,
				jobId: oldJobId,
				cvHash: randomUUID(),
				verdict: 'FIT',
				reasons: [],
				model: 'test-model',
				createdAt: daysAgo(29)
			}
		]);

		await testDatabase.insert(schema.aiUsage).values([
			{ userId: studentId, day: daysAgo(91).toISOString().slice(0, 10) },
			{ userId: studentId, day: daysAgo(89).toISOString().slice(0, 10) }
		]);

		await testDatabase.insert(schema.auditLogs).values([
			{
				id: auditOldId,
				action: 'RETENTION_TEST',
				targetType: 'test',
				targetId: randomUUID(),
				createdAt: daysAgo(25 * 30)
			},
			{
				id: auditRecentId,
				action: 'RETENTION_TEST',
				targetType: 'test',
				targetId: randomUUID(),
				createdAt: daysAgo(23 * 30)
			}
		]);
	});

	afterAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase
			.delete(schema.auditLogs)
			.where(inArray(schema.auditLogs.id, [auditOldId, auditRecentId]));
		await testDatabase
			.delete(schema.verifications)
			.where(inArray(schema.verifications.id, [verificationOldId, verificationRecentId]));
		await testDatabase.delete(schema.jobs).where(eq(schema.jobs.id, oldJobId));
		await testDatabase.delete(schema.jobs).where(eq(schema.jobs.id, recentJobId));
		await testDatabase.delete(schema.categories).where(eq(schema.categories.id, categoryId));
		await testDatabase
			.delete(schema.users)
			.where(inArray(schema.users.id, [employerId, studentId, ...applicantIds]));
		await testDatabase.$client.end();
	});

	it('expires only application CVs whose retention period has passed', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(expireApplicationCv(testDatabase, { now: NOW })).resolves.toBe(3);

		const [stillPresent] = await testDatabase
			.select({ cvKey: schema.applications.cvKey })
			.from(schema.applications)
			.where(eq(schema.applications.id, rejectedOldId));

		expect(stillPresent?.cvKey).not.toBeNull();

		await expect(expireApplicationCv(testDatabase, { now: NOW, dryRun: false })).resolves.toBe(3);

		const expired = await testDatabase
			.select({ id: schema.applications.id, cvKey: schema.applications.cvKey })
			.from(schema.applications)
			.where(
				inArray(schema.applications.id, [
					rejectedOldId,
					rejectedRecentId,
					withdrawnOldId,
					acceptedOldId,
					acceptedRecentId,
					pendingApplicationId
				])
			);

		const stillHasCv = new Set(expired.filter((row) => row.cvKey !== null).map((row) => row.id));

		expect(stillHasCv).toEqual(new Set([rejectedRecentId, acceptedRecentId, pendingApplicationId]));
	});

	it('purges sessions that expired more than 30 days ago', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(purgeExpiredSessions(testDatabase, { now: NOW })).resolves.toBe(1);
		await expect(purgeExpiredSessions(testDatabase, { now: NOW, dryRun: false })).resolves.toBe(1);

		const remaining = await testDatabase
			.select({ id: schema.sessions.id })
			.from(schema.sessions)
			.where(inArray(schema.sessions.id, [sessionOldId, sessionRecentId]));

		expect(remaining).toEqual([{ id: sessionRecentId }]);
	});

	it('purges verification tokens that expired more than 7 days ago', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(purgeExpiredVerifications(testDatabase, { now: NOW })).resolves.toBe(1);
		await expect(
			purgeExpiredVerifications(testDatabase, { now: NOW, dryRun: false })
		).resolves.toBe(1);

		const remaining = await testDatabase
			.select({ id: schema.verifications.id })
			.from(schema.verifications)
			.where(inArray(schema.verifications.id, [verificationOldId, verificationRecentId]));

		expect(remaining).toEqual([{ id: verificationRecentId }]);
	});

	it('purges notifications older than 90 days', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(purgeOldNotifications(testDatabase, { now: NOW })).resolves.toBe(1);
		await expect(purgeOldNotifications(testDatabase, { now: NOW, dryRun: false })).resolves.toBe(1);

		const remaining = await testDatabase
			.select({ id: schema.notifications.id })
			.from(schema.notifications)
			.where(inArray(schema.notifications.id, [notificationOldId, notificationRecentId]));

		expect(remaining).toEqual([{ id: notificationRecentId }]);
	});

	it('purges AI explanations older than 30 days', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(purgeOldAiExplanations(testDatabase, { now: NOW })).resolves.toBe(1);
		await expect(purgeOldAiExplanations(testDatabase, { now: NOW, dryRun: false })).resolves.toBe(
			1
		);

		const remaining = await testDatabase
			.select({ id: schema.aiExplanations.id })
			.from(schema.aiExplanations)
			.where(inArray(schema.aiExplanations.id, [explanationOldId, explanationRecentId]));

		expect(remaining).toEqual([{ id: explanationRecentId }]);
	});

	it('purges AI usage days older than 90 days', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(purgeOldAiUsage(testDatabase, { now: NOW })).resolves.toBe(1);
		await expect(purgeOldAiUsage(testDatabase, { now: NOW, dryRun: false })).resolves.toBe(1);

		const remaining = await testDatabase
			.select({ day: schema.aiUsage.day })
			.from(schema.aiUsage)
			.where(eq(schema.aiUsage.userId, studentId));

		expect(remaining).toEqual([{ day: daysAgo(89).toISOString().slice(0, 10) }]);
	});

	it('purges audit logs older than 24 months', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(purgeOldAuditLogs(testDatabase, { now: NOW })).resolves.toBe(1);
		await expect(purgeOldAuditLogs(testDatabase, { now: NOW, dryRun: false })).resolves.toBe(1);

		const remaining = await testDatabase
			.select({ id: schema.auditLogs.id })
			.from(schema.auditLogs)
			.where(inArray(schema.auditLogs.id, [auditOldId, auditRecentId]));

		expect(remaining).toEqual([{ id: auditRecentId }]);
	});
});
