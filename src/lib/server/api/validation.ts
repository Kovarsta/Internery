import { z } from 'zod';
import { ApiError } from './errors.ts';

/**
 * Parses a JSON request body and validates it against a Zod schema.
 *
 * `<TSchema extends z.ZodType>` means "give me a Zod schema". That constraint
 * lets the body call `schema.safeParse()` and lets `z.infer` read the schema's
 * output type.
 *
 * The return type `Promise<z.infer<TSchema>>` therefore describes the exact
 * object the caller gets back, instead of `unknown`:
 *
 * ```ts
 * const body = await parseJson(request, rejectSchema);
 * // body: { reason: string | null }
 * ```
 *
 * Malformed JSON and schema failures both become `VALIDATION_ERROR` responses
 * with a field-level `details` array.
 */
export async function parseJson<TSchema extends z.ZodType>(
	request: Request,
	schema: TSchema
): Promise<z.infer<TSchema>> {
	const text = await readBodyText(request);

	return parseWithSchema(schema, parseJsonText(text));
}

/**
 * Parses an optional JSON body.
 *
 * Returns null for an empty body, so a request body the contract marks as
 * optional does not have to be sent as `{}`.
 */
export async function parseOptionalJson<TSchema extends z.ZodType>(
	request: Request,
	schema: TSchema
): Promise<z.infer<TSchema> | null> {
	const text = await readBodyText(request);

	if (text.trim() === '') {
		return null;
	}

	return parseWithSchema(schema, parseJsonText(text));
}

/** Validates SvelteKit route parameters against a Zod schema. */
export function parseParams<TSchema extends z.ZodType>(
	params: unknown,
	schema: TSchema
): z.infer<TSchema> {
	return parseWithSchema(schema, params);
}

async function readBodyText(request: Request): Promise<string> {
	try {
		return await request.text();
	} catch {
		throw new ApiError('VALIDATION_ERROR', 'Request body must be valid JSON.');
	}
}

function parseJsonText(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		throw new ApiError('VALIDATION_ERROR', 'Request body must be valid JSON.');
	}
}

/** Validates URL search parameters against a Zod schema. */
export function parseQuery<TSchema extends z.ZodType>(url: URL, schema: TSchema): z.infer<TSchema> {
	const query = Object.fromEntries(url.searchParams.entries());

	return parseWithSchema(schema, query);
}

/**
 * Validates the text fields of a multipart form against a Zod schema.
 *
 * File fields are skipped, so the schema only sees the text values and the
 * handler can read the files it expects on its own.
 */
export function parseFormFields<TSchema extends z.ZodType>(
	form: FormData,
	schema: TSchema
): z.infer<TSchema> {
	const fields: Record<string, string> = {};

	for (const [field, value] of form.entries()) {
		if (typeof value === 'string') {
			fields[field] = value;
		}
	}

	return parseWithSchema(schema, fields);
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
