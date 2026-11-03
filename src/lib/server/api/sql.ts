/**
 * Escapes LIKE wildcards so a user-supplied string matches literally.
 *
 * Without this, a search for `%` would match every row, and `_` would match any
 * single character. Use it with `ilike ... escape '\'`.
 */
export function toLikePattern(value: string): string {
	const escaped = value.replace(/[\\%_]/g, (character) => `\\${character}`);

	return `%${escaped}%`;
}
