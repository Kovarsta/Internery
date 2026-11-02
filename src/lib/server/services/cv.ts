import { eq } from 'drizzle-orm';
import type { CvUpload } from '#lib/server/api/uploads.ts';
import type { Database } from '#lib/server/db/types.ts';
import { studentProfiles } from '#lib/server/db/product.schema.ts';
import type { Storage } from '#lib/server/storage/client.ts';
import { newCvKey } from '#lib/server/storage/keys.ts';

/** The stored CV of a student, as far as the database knows it. */
export type CvRecord = {
	key: string;
	fileName: string;
	mimeType: string | null;
};

/** Returns the student's current CV metadata, or null when none is stored. */
export async function getOwnCv(database: Database, studentId: string): Promise<CvRecord | null> {
	// The projection renames `cvKey` to `key` for the service type. Drizzle
	// infers each field from the column object, so `key` and `fileName` are
	// `string | null` here; the guard below narrows them. See
	// `docs/decisions/drizzle-style.md`.
	const [profile] = await database
		.select({
			key: studentProfiles.cvKey,
			fileName: studentProfiles.cvFileName,
			mimeType: studentProfiles.cvMimeType
		})
		.from(studentProfiles)
		.where(eq(studentProfiles.userId, studentId))
		.limit(1);

	// Both columns are set together by the upload and by the constraint, so a
	// missing file name means there is no usable CV.
	if (!profile?.key || !profile.fileName) {
		return null;
	}

	return { key: profile.key, fileName: profile.fileName, mimeType: profile.mimeType };
}

/**
 * Clears the current CV columns.
 *
 * Applications keep their own snapshot key, so the object is not deleted here.
 * The reference-aware sweep removes it once no profile and no application
 * points at it.
 */
export async function removeOwnCv(database: Database, studentId: string): Promise<void> {
	await database.transaction(async (tx) => {
		// Serialise with applyToJob, which locks the same row before copying the
		// key onto an application.
		await tx
			.select({ userId: studentProfiles.userId })
			.from(studentProfiles)
			.where(eq(studentProfiles.userId, studentId))
			.for('update');

		await tx
			.update(studentProfiles)
			.set({ cvKey: null, cvFileName: null, cvMimeType: null, cvSizeBytes: null })
			.where(eq(studentProfiles.userId, studentId));
	});
}

/**
 * Stores a CV and points the student profile at it.
 *
 * The object is written before the row, so the profile never references a key
 * that is not stored. The previous object is left for the reference-aware
 * sweep, because applications may still point at it.
 */
export async function saveCv(
	database: Database,
	storage: Storage,
	studentId: string,
	upload: CvUpload
): Promise<void> {
	const key = newCvKey(studentId, upload.extension);

	await storage.putObject(key, upload.bytes, upload.mimeType);

	await database.transaction(async (tx) => {
		// Same lock as applyToJob: an application either snapshots the old key
		// or the new one, and never races a replacement mid-way.
		await tx
			.select({ userId: studentProfiles.userId })
			.from(studentProfiles)
			.where(eq(studentProfiles.userId, studentId))
			.for('update');

		await tx
			.insert(studentProfiles)
			.values({
				userId: studentId,
				cvKey: key,
				cvFileName: upload.fileName,
				cvMimeType: upload.mimeType,
				cvSizeBytes: upload.bytes.length
			})
			.onConflictDoUpdate({
				target: studentProfiles.userId,
				set: {
					cvKey: key,
					cvFileName: upload.fileName,
					cvMimeType: upload.mimeType,
					cvSizeBytes: upload.bytes.length
				}
			});
	});
}
