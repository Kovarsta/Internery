import { and, desc, eq } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import type { LicenseUpload } from '#lib/server/api/uploads.ts';
import type { Database } from '#lib/server/db/types.ts';
import { isUniqueViolation } from '#lib/server/db/errors.ts';
import { employerProfiles, verificationRequests } from '#lib/server/db/product.schema.ts';
import type { Storage } from '#lib/server/storage/client.ts';
import { newLicenseKey } from '#lib/server/storage/keys.ts';

export type VerificationRequestRecord = typeof verificationRequests.$inferSelect;

export type SubmitVerificationInput = {
	orgName: string;
	websiteUrl: string | null;
	contactInfo: string;
	license: LicenseUpload | null;
};

/** Returns the employer's latest verification request, or null when none exists. */
export async function findLatestVerificationRequest(
	database: Database,
	employerId: string
): Promise<VerificationRequestRecord | null> {
	const [request] = await database
		.select()
		.from(verificationRequests)
		.where(eq(verificationRequests.employerId, employerId))
		.orderBy(desc(verificationRequests.createdAt), desc(verificationRequests.id))
		.limit(1);

	return request ?? null;
}

/**
 * Stores a new verification request as `PENDING` and marks the employer profile
 * pending while it waits.
 *
 * An employer may have only one pending request (AC-39.2). The partial unique
 * index enforces that in the database; this function checks first so the common
 * case is a clean `VERIFICATION_PENDING`, and maps the index violation to the
 * same code when two submits race. An already verified employer cannot submit
 * again, because a second review would have to lower the badge it already
 * earned.
 *
 * The licence object is written before the row, so a stored request never
 * points at a missing object. An object whose insert fails is left for the
 * storage sweep.
 */
export async function submitVerificationRequest(
	database: Database,
	storage: Storage,
	employerId: string,
	input: SubmitVerificationInput
): Promise<VerificationRequestRecord> {
	const [profile] = await database
		.select({ verificationStatus: employerProfiles.verificationStatus })
		.from(employerProfiles)
		.where(eq(employerProfiles.userId, employerId))
		.limit(1);

	if (profile?.verificationStatus === 'VERIFIED') {
		throw new DomainError('INVALID_STATE_TRANSITION', 'Your organisation is already verified.');
	}

	const pending = await database
		.select({ id: verificationRequests.id })
		.from(verificationRequests)
		.where(
			and(
				eq(verificationRequests.employerId, employerId),
				eq(verificationRequests.status, 'PENDING')
			)
		)
		.limit(1);

	if (pending.length > 0) {
		throw new DomainError('VERIFICATION_PENDING');
	}

	let licenseKey: string | null = null;

	if (input.license !== null) {
		licenseKey = newLicenseKey(employerId, input.license.extension);
		await storage.putObject(licenseKey, input.license.bytes, input.license.mimeType);
	}

	try {
		return await database.transaction(async (tx) => {
			const [created] = await tx
				.insert(verificationRequests)
				.values({
					employerId,
					orgName: input.orgName,
					websiteUrl: input.websiteUrl,
					contactInfo: input.contactInfo,
					licenseKey
				})
				.returning();

			if (!created) {
				throw new Error('The verification request could not be written.');
			}

			await tx
				.update(employerProfiles)
				.set({ verificationStatus: 'PENDING', verifiedAt: null })
				.where(eq(employerProfiles.userId, employerId));

			return created;
		});
	} catch (error) {
		if (isUniqueViolation(error)) {
			throw new DomainError('VERIFICATION_PENDING');
		}

		throw error;
	}
}
