import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import { createCategory, deleteCategory, listAdminUsers, lockUser, unlockUser } from './admin.ts';

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

const adminId = randomUUID();
const studentId = randomUUID();
const employerId = randomUUID();
const studentEmail = `admin-test-${studentId}@example.com`;
const categoryName = `Test category ${randomUUID()}`;

const jobId = randomUUID();

describe.skipIf(!testDatabase)('admin users and categories', () => {
	beforeAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.insert(schema.users).values([
			{
				id: adminId,
				name: 'Admin Test',
				email: `admin-test-${adminId}@example.com`,
				emailVerified: true,
				role: 'ADMIN',
				status: 'ACTIVE'
			},
			{
				id: studentId,
				name: 'Student Test',
				email: studentEmail,
				emailVerified: true,
				role: 'STUDENT',
				status: 'ACTIVE'
			},
			{
				id: employerId,
				name: 'Employer Test',
				email: `admin-test-${employerId}@example.com`,
				emailVerified: true,
				role: 'EMPLOYER',
				status: 'ACTIVE'
			}
		]);
	});

	afterAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.delete(schema.jobs).where(eq(schema.jobs.id, jobId));
		await testDatabase
			.delete(schema.auditLogs)
			.where(inArray(schema.auditLogs.targetId, [studentId, adminId]));
		await testDatabase
			.delete(schema.userModeration)
			.where(eq(schema.userModeration.userId, studentId));
		await testDatabase
			.delete(schema.users)
			.where(inArray(schema.users.id, [adminId, studentId, employerId]));
		await testDatabase.$client.end();
	});

	it('finds an account by an email substring', async () => {
		if (!testDatabase) {
			return;
		}

		const page = await listAdminUsers(testDatabase, {
			query: studentEmail,
			limit: 20,
			offset: 0
		});

		expect(page.items.map((user) => user.id)).toContain(studentId);
	});

	it('locks and unlocks an account', async () => {
		if (!testDatabase) {
			return;
		}

		const locked = await lockUser(testDatabase, {
			adminId,
			userId: studentId,
			reason: 'Test lock'
		});

		expect(locked.status).toBe('LOCKED');
		expect(locked.lockReason).toBe('Test lock');

		const unlocked = await unlockUser(testDatabase, { adminId, userId: studentId });

		expect(unlocked.status).toBe('ACTIVE');
		expect(unlocked.lockedAt).toBeNull();
	});

	it('refuses to lock an administrator', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(
			lockUser(testDatabase, { adminId, userId: adminId, reason: null })
		).rejects.toMatchObject({ code: 'INVALID_STATE_TRANSITION' });
	});

	it('rejects a duplicate category name and a category in use', async () => {
		if (!testDatabase) {
			return;
		}

		const created = await createCategory(testDatabase, { name: categoryName });

		expect(created.id).toBeDefined();

		await expect(createCategory(testDatabase, { name: categoryName })).rejects.toMatchObject({
			code: 'NAME_TAKEN'
		});

		await testDatabase.insert(schema.jobs).values({
			id: jobId,
			employerId,
			categoryId: created.id,
			title: 'Category test job',
			description: 'Created by the admin service test.',
			location: 'Test',
			schedule: 'One evening',
			salaryAmount: 100_000,
			salaryType: 'FIXED',
			startDate: '2026-12-01',
			endDate: '2026-12-02'
		});

		await expect(deleteCategory(testDatabase, created.id)).rejects.toMatchObject({
			code: 'CATEGORY_IN_USE'
		});

		await testDatabase.delete(schema.jobs).where(eq(schema.jobs.id, jobId));
		await expect(deleteCategory(testDatabase, created.id)).resolves.toBeUndefined();
	});
});
