import { eq } from 'drizzle-orm';
import type { Database } from '#lib/server/db/types.ts';
import { employerProfiles, studentProfiles } from '#lib/server/db/product.schema.ts';

export type StudentProfileRecord = typeof studentProfiles.$inferSelect;
export type EmployerProfileRecord = typeof employerProfiles.$inferSelect;

export type StudentProfileInput = {
	university: string;
	major: string;
	skills: string[];
	availability: string | null;
	bio: string | null;
};

export type EmployerProfileInput = {
	orgName: string;
	orgType: EmployerProfileRecord['orgType'];
	description: string | null;
	address: string | null;
	contactPhone: string | null;
};

/** Returns the student profile row, or null before the student completes it. */
export async function getStudentProfile(
	database: Database,
	userId: string
): Promise<StudentProfileRecord | null> {
	const [profile] = await database
		.select()
		.from(studentProfiles)
		.where(eq(studentProfiles.userId, userId))
		.limit(1);

	return profile ?? null;
}

/** Returns the employer profile row, or null before the employer completes it. */
export async function getEmployerProfile(
	database: Database,
	userId: string
): Promise<EmployerProfileRecord | null> {
	const [profile] = await database
		.select()
		.from(employerProfiles)
		.where(eq(employerProfiles.userId, userId))
		.limit(1);

	return profile ?? null;
}

/**
 * Creates or replaces the student profile fields.
 *
 * The CV columns, ratings and timestamps are not part of the input and are left
 * untouched.
 */
export async function saveStudentProfile(
	database: Database,
	userId: string,
	input: StudentProfileInput
): Promise<StudentProfileRecord> {
	const [profile] = await database
		.insert(studentProfiles)
		.values({ userId, ...input })
		.onConflictDoUpdate({
			target: studentProfiles.userId,
			set: input
		})
		.returning();

	if (!profile) {
		throw new Error('Student profile upsert returned no row.');
	}

	return profile;
}

/**
 * Creates or replaces the employer profile fields.
 *
 * Verification status, ratings and timestamps are owned by other flows and are
 * left untouched.
 */
export async function saveEmployerProfile(
	database: Database,
	userId: string,
	input: EmployerProfileInput
): Promise<EmployerProfileRecord> {
	const [profile] = await database
		.insert(employerProfiles)
		.values({ userId, ...input })
		.onConflictDoUpdate({
			target: employerProfiles.userId,
			set: input
		})
		.returning();

	if (!profile) {
		throw new Error('Employer profile upsert returned no row.');
	}

	return profile;
}
