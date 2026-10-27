import { eq } from 'drizzle-orm';
import type { Database } from '#lib/server/db/types.ts';
import { employerProfiles, studentProfiles } from '#lib/server/db/product.schema.ts';

export type StudentProfileRecord = typeof studentProfiles.$inferSelect;
export type EmployerProfileRecord = typeof employerProfiles.$inferSelect;

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
