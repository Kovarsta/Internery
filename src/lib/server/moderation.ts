import { db } from '#lib/server/db/index.ts';
import { userModeration } from '#lib/server/db/product.schema.ts';

/**
 * Creates the moderation row for a user on first use.
 *
 * Call this from the first moderation event, such as a failed-login threshold
 * or an admin lock. Do not call it during signup. A missing row means zero
 * failed logins and no temporary or admin lock.
 */
export async function ensureUserModeration(userId: string) {
	await db.insert(userModeration).values({ userId }).onConflictDoNothing();
}
