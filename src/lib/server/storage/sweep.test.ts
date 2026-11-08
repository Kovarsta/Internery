import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import type { Storage, StoredObjectInfo } from './client.ts';
import { collectReferencedKeys, sweepOrphanedObjects } from './sweep.ts';

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

const employerId = randomUUID();
const studentId = randomUUID();
const categoryId = randomUUID();
const jobId = randomUUID();
const applicationId = randomUUID();

// Unique per run: other test files share the database, so fixed keys would
// make the reference-set assertion depend on their timing.
const runId = randomUUID();
const profileCvKey = `cv/sweep-${runId}/profile.pdf`;
const applicationCvKey = `cv/sweep-${runId}/application.pdf`;
const avatarKey = `avatars/sweep-${runId}.webp`;
const orphanKey = `cv/sweep-${runId}/orphan.pdf`;
const recentKey = `cv/sweep-${runId}/recent.pdf`;
const noDateKey = `cv/sweep-${runId}/no-date.pdf`;

const OLD = new Date('2025-12-01T00:00:00Z');
const RECENT = new Date('2026-01-09T00:00:00Z');
const NOW = new Date('2026-01-10T00:00:00Z');

const bucketObjects: StoredObjectInfo[] = [
	{ key: profileCvKey, lastModified: OLD },
	{ key: applicationCvKey, lastModified: OLD },
	{ key: avatarKey, lastModified: OLD },
	{ key: orphanKey, lastModified: OLD },
	{ key: recentKey, lastModified: RECENT },
	{ key: noDateKey, lastModified: null },
	{ key: 'avatars/_blank.png', lastModified: OLD },
	{ key: 'tmp/ignored.bin', lastModified: OLD }
];

/** An in-memory bucket that pages two objects at a time and records deletions. */
function createFakeStorage(objects: StoredObjectInfo[]) {
	const deleted: string[] = [];

	const storage: Storage = {
		async putObject() {},
		async getObject() {
			return null;
		},
		async deleteObject(key) {
			deleted.push(key);
		},
		async listObjects(prefix, continuationToken) {
			const matching = objects.filter((object) => object.key.startsWith(prefix));
			const start = continuationToken ? Number(continuationToken) : 0;
			const page = matching.slice(start, start + 2);
			const nextToken = start + page.length < matching.length ? String(start + page.length) : null;

			return { objects: page, nextToken };
		},
		async deleteObjects(keys) {
			deleted.push(...keys);
		}
	};

	return { storage, deleted };
}

describe.skipIf(!testDatabase)('storage sweep', () => {
	beforeAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.insert(schema.users).values([
			{
				id: employerId,
				name: 'Sweep Employer',
				email: `${employerId}@example.com`,
				emailVerified: true,
				role: 'EMPLOYER',
				status: 'ACTIVE'
			},
			{
				id: studentId,
				name: 'Sweep Student',
				email: `${studentId}@example.com`,
				emailVerified: true,
				role: 'STUDENT',
				status: 'ACTIVE'
			}
		]);

		await testDatabase.insert(schema.userProfiles).values({
			userId: studentId,
			avatarKey
		});

		await testDatabase.insert(schema.studentProfiles).values({
			userId: studentId,
			cvKey: profileCvKey,
			cvFileName: 'profile.pdf',
			cvMimeType: 'application/pdf',
			cvSizeBytes: 1024
		});

		await testDatabase.insert(schema.categories).values({
			id: categoryId,
			name: `Sweep category ${categoryId}`
		});

		await testDatabase.insert(schema.jobs).values({
			id: jobId,
			employerId,
			categoryId,
			title: 'Sweep job',
			description: 'Sweep fixture.',
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

		await testDatabase.insert(schema.applications).values({
			id: applicationId,
			jobId,
			studentId,
			cvKey: applicationCvKey,
			cvFileName: 'application.pdf',
			status: 'PENDING'
		});
	});

	afterAll(async () => {
		if (!testDatabase) {
			return;
		}

		// Applications reference the job with cascade and the users with
		// restrict, so the job goes first.
		await testDatabase.delete(schema.jobs).where(eq(schema.jobs.id, jobId));
		await testDatabase.delete(schema.categories).where(eq(schema.categories.id, categoryId));
		await testDatabase
			.delete(schema.users)
			.where(inArray(schema.users.id, [employerId, studentId]));
		await testDatabase.$client.end();
	});

	it('collects keys from profiles and application snapshots', async () => {
		if (!testDatabase) {
			return;
		}

		const keys = await collectReferencedKeys(testDatabase);

		expect(keys.has(profileCvKey)).toBe(true);
		expect(keys.has(applicationCvKey)).toBe(true);
		expect(keys.has(avatarKey)).toBe(true);
		expect(keys.has(orphanKey)).toBe(false);
	});

	it('only reports unreferenced, old objects in a dry run', async () => {
		if (!testDatabase) {
			return;
		}

		const { storage, deleted } = createFakeStorage(bucketObjects);
		const result = await sweepOrphanedObjects(testDatabase, storage, { now: NOW });

		expect(result.scanned).toBe(7);
		expect(result.deleted).toEqual([orphanKey]);
		expect(deleted).toEqual([]);
	});

	it('deletes only the unreferenced, old objects when applied', async () => {
		if (!testDatabase) {
			return;
		}

		const { storage, deleted } = createFakeStorage(bucketObjects);
		const result = await sweepOrphanedObjects(testDatabase, storage, {
			now: NOW,
			dryRun: false
		});

		expect(result.deleted).toEqual([orphanKey]);
		expect(deleted).toEqual([orphanKey]);
	});
});
