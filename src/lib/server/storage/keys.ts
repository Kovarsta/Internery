/**
 * Reserved storage keys.
 *
 * Keys are opaque strings; the prefixes only make the bucket readable. Every
 * upload gets a new key, so nothing is ever overwritten in place.
 */

/**
 * The shared blank avatar.
 *
 * A reset points `user_profiles.avatarKey` at this key instead of clearing it.
 * That keeps the OAuth provider image shadowed and gives the API something to
 * serve. The object is provisioned with the bucket and is exempt from the
 * orphan sweep. See `docs/decisions/avatar-storage.md`.
 */
export const BLANK_AVATAR_KEY = 'avatars/_blank.png';
