import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';

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

/**
 * Builds a case-insensitive “contains” condition for one text column.
 *
 * Why this is raw SQL: Drizzle's `ilike` does not expose the `escape` clause,
 * and a literal search must not turn `%` or `_` into wildcards. The explicit
 * escape keeps user input literal.
 *
 * @param column - The column expression to search, for example `jobs.title`.
 * @param value - The raw search text from the caller.
 * @returns A `WHERE` fragment: `column ILIKE '%value%' ESCAPE '\'`.
 */
export function containsText(column: SQLWrapper, value: string): SQL {
	return sql`${column} ilike ${toLikePattern(value)} escape '\\'`;
}
