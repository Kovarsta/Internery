import { hash, verify, type Options } from '@node-rs/argon2';

/**
 * Argon2id parameters shared by Better Auth and the seed script.
 *
 * @node-rs/argon2 exposes `Algorithm` as a const enum, which cannot be used
 * with the project's verbatimModuleSyntax setting. 2 is Argon2id.
 */
const argon2Options: Options = {
	memoryCost: 65536,
	timeCost: 3,
	parallelism: 4,
	outputLen: 32,
	algorithm: 2
};

/** Hashes a plain-text password with the project's Argon2id settings. */
export function hashPassword(password: string): Promise<string> {
	return hash(password, argon2Options);
}

/** Verifies a plain-text password against a stored Argon2id hash. */
export function verifyPassword({
	password,
	hash: passwordHash
}: {
	password: string;
	hash: string;
}): Promise<boolean> {
	return verify(passwordHash, password, argon2Options);
}
