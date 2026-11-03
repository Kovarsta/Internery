/**
 * PostgreSQL error codes the services react to.
 *
 * Drizzle wraps driver errors in its own error type, but the original code
 * stays on the `code` property, so a plain structural check is enough.
 */
const UNIQUE_VIOLATION = '23505';

// A foreign key declared `ON DELETE RESTRICT` raises `restrict_violation`
// (23001), while a plain reference raises `foreign_key_violation` (23503).
// Both mean "another row still points here".
const FOREIGN_KEY_VIOLATION = '23503';
const RESTRICT_VIOLATION = '23001';

/** True when a write broke a unique constraint. */
export function isUniqueViolation(error: unknown): boolean {
	return hasPostgresCode(error, UNIQUE_VIOLATION);
}

/** True when a write broke a foreign-key constraint, such as deleting a row still in use. */
export function isForeignKeyViolation(error: unknown): boolean {
	return (
		hasPostgresCode(error, FOREIGN_KEY_VIOLATION) || hasPostgresCode(error, RESTRICT_VIOLATION)
	);
}

function hasPostgresCode(error: unknown, code: string): boolean {
	if (typeof error !== 'object' || error === null) {
		return false;
	}

	const candidate = error as { cause?: { code?: string }; code?: string };

	// Drizzle may wrap the driver error in `cause`; either level can carry the
	// PostgreSQL code.
	return candidate.code === code || candidate.cause?.code === code;
}
