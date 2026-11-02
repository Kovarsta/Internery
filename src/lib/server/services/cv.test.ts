import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import type { Storage } from '#lib/server/storage/client.ts';
import { getOwnCv, removeOwnCv, saveCv } from './cv.ts';

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

const studentId = randomUUID();

describe.skipIf(!testDatabase)('cv', () => {
	beforeAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.insert(schema.users).values({
			id: studentId,
			name: 'CV Student',
			email: `${studentId}@example.com`,
			emailVerified: true,
			role: 'STUDENT',
			status: 'ACTIVE'
		});

		await testDatabase.insert(schema.studentProfiles).values({ userId: studentId });
	});

	afterAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.delete(schema.users).where(eq(schema.users.id, studentId));
		await testDatabase.$client.end();
	});

	it('returns null when the profile has no CV', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(getOwnCv(testDatabase, studentId)).resolves.toBeNull();
		await expect(getOwnCv(testDatabase, randomUUID())).resolves.toBeNull();
	});

	it('returns the stored CV metadata', async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase
			.update(schema.studentProfiles)
			.set({
				cvKey: 'cv/student/resume.pdf',
				cvFileName: 'Nguyễn Văn An.pdf',
				cvMimeType: 'application/pdf',
				cvSizeBytes: 1024
			})
			.where(eq(schema.studentProfiles.userId, studentId));

		await expect(getOwnCv(testDatabase, studentId)).resolves.toEqual({
			key: 'cv/student/resume.pdf',
			fileName: 'Nguyễn Văn An.pdf',
			mimeType: 'application/pdf'
		});
	});

	it('clears every CV column and stays safe to repeat', async () => {
		if (!testDatabase) {
			return;
		}

		await removeOwnCv(testDatabase, studentId);
		await removeOwnCv(testDatabase, studentId);

		await expect(getOwnCv(testDatabase, studentId)).resolves.toBeNull();

		const [profile] = await testDatabase
			.select({
				cvKey: schema.studentProfiles.cvKey,
				cvFileName: schema.studentProfiles.cvFileName,
				cvMimeType: schema.studentProfiles.cvMimeType,
				cvSizeBytes: schema.studentProfiles.cvSizeBytes
			})
			.from(schema.studentProfiles)
			.where(eq(schema.studentProfiles.userId, studentId));

		expect(profile).toEqual({
			cvKey: null,
			cvFileName: null,
			cvMimeType: null,
			cvSizeBytes: null
		});
	});

	it('stores an upload under a new key and points the profile at it', async () => {
		if (!testDatabase) {
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
			},
			async listObjects() {
				return { objects: [], nextToken: null };
			},
			async deleteObjects() {}
		};

		const upload = {
			bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
			fileName: 'resume.pdf',
			mimeType: 'application/pdf' as const,
			extension: 'pdf' as const
		};

		await saveCv(testDatabase, fakeStorage, studentId, upload);

		const cv = await getOwnCv(testDatabase, studentId);

		if (!cv) {
			throw new Error('Expected the saved CV.');
		}

		expect(cv.key.startsWith(`cv/${studentId}/`)).toBe(true);
		expect(cv.key.endsWith('.pdf')).toBe(true);
		expect(cv.fileName).toBe('resume.pdf');
		expect(cv.mimeType).toBe('application/pdf');
		expect(objects.get(cv.key)).toEqual(upload.bytes);

		const [profile] = await testDatabase
			.select({ cvSizeBytes: schema.studentProfiles.cvSizeBytes })
			.from(schema.studentProfiles)
			.where(eq(schema.studentProfiles.userId, studentId));

		expect(profile?.cvSizeBytes).toBe(upload.bytes.length);
	});
});
