import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import { findLatestVerificationRequest } from './verification.ts';

// Set TEST_DATABASE_URL to run the database-backed tests.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl
	? drizzle(postgres(testDatabaseUrl, { max: 1 }), { schema })
	: null;

const employerId = randomUUID();
const approvedRequestId = randomUUID();
const pendingRequestId = randomUUID();

describe.skipIf(!testDatabase)('findLatestVerificationRequest', () => {
	beforeAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase.insert(schema.users).values({
			id: employerId,
			name: 'Verification Employer',
			email: `${employerId}@example.com`,
			emailVerified: true,
			role: 'EMPLOYER',
			status: 'ACTIVE'
		});

		await testDatabase.insert(schema.verificationRequests).values([
			{
				id: approvedRequestId,
				employerId,
				orgName: 'Older Org Name',
				contactInfo: 'owner@old.example',
				status: 'APPROVED',
				reviewedAt: new Date('2026-02-02T08:00:00Z'),
				createdAt: new Date('2026-02-01T08:00:00Z')
			},
			{
				id: pendingRequestId,
				employerId,
				orgName: 'Current Org Name',
				websiteUrl: 'https://acme.example',
				contactInfo: 'owner@acme.example',
				licenseKey: 'licenses/acme.pdf',
				status: 'PENDING',
				createdAt: new Date('2026-03-01T08:00:00Z')
			}
		]);
	});

	afterAll(async () => {
		if (!testDatabase) {
			return;
		}

		await testDatabase
			.delete(schema.verificationRequests)
			.where(inArray(schema.verificationRequests.id, [approvedRequestId, pendingRequestId]));
		await testDatabase.delete(schema.users).where(eq(schema.users.id, employerId));
		await testDatabase.$client.end();
	});

	it('returns the newest request of the employer', async () => {
		if (!testDatabase) {
			return;
		}

		const request = await findLatestVerificationRequest(testDatabase, employerId);

		expect(request).toMatchObject({
			id: pendingRequestId,
			orgName: 'Current Org Name',
			status: 'PENDING',
			licenseKey: 'licenses/acme.pdf'
		});
	});

	it('returns null when the employer never submitted a request', async () => {
		if (!testDatabase) {
			return;
		}

		await expect(findLatestVerificationRequest(testDatabase, randomUUID())).resolves.toBeNull();
	});
});
