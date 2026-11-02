import { eq } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import type { AvatarImage } from '#lib/server/api/uploads.ts';
import type { Database } from '#lib/server/db/types.ts';
import { users } from '#lib/server/db/auth.schema.ts';
import { userProfiles } from '#lib/server/db/product.schema.ts';
import type { Storage } from '#lib/server/storage/client.ts';
import { BLANK_AVATAR_KEY, newAvatarKey } from '#lib/server/storage/keys.ts';

export type UserProfileRecord = typeof userProfiles.$inferSelect;
export type UserRecord = typeof users.$inferSelect;

export type UserAccountUpdate = {
	fullName?: string;
	phone?: string | null;
};

export type UpdatedUserAccount = {
	user: UserRecord;
	profile: UserProfileRecord | null;
};

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

/**
 * Returns the stored avatar key for a user.
 *
 * `null` covers both "no picture" and "no profile row", so the route can answer
 * them the same way and not reveal whether an account exists.
 */
export async function getAvatarKey(database: Database, userId: string): Promise<string | null> {
	const [profile] = await database
		.select({ avatarKey: userProfiles.avatarKey })
		.from(userProfiles)
		.where(eq(userProfiles.userId, userId))
		.limit(1);

	return profile?.avatarKey ?? null;
}

/**
 * Resets a user's avatar to the shared blank placeholder.
 *
 * Points `avatarKey` at the reserved key rather than clearing it, so the OAuth
 * provider image stays shadowed and the avatar route still has bytes to serve.
 * Safe to repeat: the second call writes the same key.
 */
export async function resetAvatar(database: Database, userId: string): Promise<void> {
	// The profile row is created with the user, but the upsert keeps this
	// correct for an account made before that hook existed.
	await database
		.insert(userProfiles)
		.values({ userId, avatarKey: BLANK_AVATAR_KEY })
		.onConflictDoUpdate({
			target: userProfiles.userId,
			set: { avatarKey: BLANK_AVATAR_KEY }
		});
}

/**
 * Stores an uploaded avatar and points the profile at it.
 *
 * The object is written before the row, so the profile never references a key
 * that is not stored yet. The previous object is not deleted here: the
 * reference-aware sweep removes it after the grace period.
 */
export async function saveAvatar(
	database: Database,
	storage: Storage,
	userId: string,
	image: AvatarImage
): Promise<void> {
	const key = newAvatarKey(userId, image.extension);

	await storage.putObject(key, image.bytes, image.contentType);

	await database
		.insert(userProfiles)
		.values({ userId, avatarKey: key })
		.onConflictDoUpdate({
			target: userProfiles.userId,
			set: { avatarKey: key }
		});
}

/**
 * Updates the account name and common profile phone in one transaction.
 *
 * Fields that are `undefined` are left unchanged. A missing `user_profiles` row
 * is created when the phone is updated.
 */
export async function updateUserAccount(
	database: Database,
	userId: string,
	input: UserAccountUpdate
): Promise<UpdatedUserAccount> {
	return database.transaction(async (tx) => {
		if (input.fullName !== undefined) {
			await tx.update(users).set({ name: input.fullName }).where(eq(users.id, userId));
		}

		if (input.phone !== undefined) {
			await tx
				.insert(userProfiles)
				.values({ userId, phone: input.phone })
				.onConflictDoUpdate({
					target: userProfiles.userId,
					set: { phone: input.phone }
				});
		}

		const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
		const [profile] = await tx
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.userId, userId))
			.limit(1);

		if (!user) {
			throw new DomainError('NOT_FOUND');
		}

		return {
			user,
			profile: profile ?? null
		};
	});
}
