import { z } from 'zod';
import { ApiError } from './errors.ts';

/**
 * Parses a JSON request body and validates it against a Zod schema.
 *
 * Malformed JSON and schema failures both become `VALIDATION_ERROR` responses
 * with a field-level `details` array.
 */
export async function parseJson<TSchema extends z.ZodType>(
	request: Request,
	schema: TSchema
): Promise<z.infer<TSchema>> {
	let body: unknown;

	try {
		body = await request.json();
	} catch {
		throw new ApiError('VALIDATION_ERROR', 'Request body must be valid JSON.');
	}

	return parseWithSchema(schema, body);
}

/** Validates SvelteKit route parameters against a Zod schema. */
export function parseParams<TSchema extends z.ZodType>(
	params: unknown,
	schema: TSchema
): z.infer<TSchema> {
	return parseWithSchema(schema, params);
}

/** Validates URL search parameters against a Zod schema. */
export function parseQuery<TSchema extends z.ZodType>(url: URL, schema: TSchema): z.infer<TSchema> {
	const query = Object.fromEntries(url.searchParams.entries());

	return parseWithSchema(schema, query);
}

function parseWithSchema<TSchema extends z.ZodType>(
	schema: TSchema,
	value: unknown
): z.infer<TSchema> {
	const result = schema.safeParse(value);

	if (result.success) {
		return result.data;
	}

	const details = result.error.issues.map((issue) => ({
		field: issue.path.length > 0 ? issue.path.join('.') : 'body',
		message: issue.message
	}));

	throw new ApiError('VALIDATION_ERROR', 'Request validation failed.', details);
}
