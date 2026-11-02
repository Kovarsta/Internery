/**
 * Reserved storage keys and key builders.
 *
 * Keys are opaque strings; the prefixes only make the bucket readable. Every
 * upload gets a new key, so nothing is ever overwritten in place.
 */
import { randomUUID } from 'node:crypto';

export const AVATAR_PREFIX = 'avatars/';

/**
 * The shared blank avatar.
 *
 * A reset points `user_profiles.avatarKey` at this key instead of clearing it.
 * That keeps the OAuth provider image shadowed and gives the API something to
 * serve. The object is provisioned with the bucket and is exempt from the
 * orphan sweep. See `docs/decisions/avatar-storage.md`.
 */
export const BLANK_AVATAR_KEY = `${AVATAR_PREFIX}_blank.png`;

/** Builds a fresh key for an upload under the owner's user id. */
export function newAvatarKey(userId: string, extension: 'png' | 'jpg'): string {
	return `${AVATAR_PREFIX}${userId}/${randomUUID()}.${extension}`;
}
