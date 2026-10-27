import { eq } from 'drizzle-orm';
import type { Database } from '#lib/server/db/types.ts';
import { userProfiles } from '#lib/server/db/product.schema.ts';

export type UserProfileRecord = typeof userProfiles.$inferSelect;

/** Returns the common profile row, or null when it has not been created. */
export async function getUserProfile(
	database: Database,
	userId: string
): Promise<UserProfileRecord | null> {
	const [profile] = await database
		.select()
		.from(userProfiles)
		.where(eq(userProfiles.userId, userId))
		.limit(1);

	return profile ?? null;
}
