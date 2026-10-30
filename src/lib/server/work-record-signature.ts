import { createHmac, timingSafeEqual } from 'node:crypto';
import type { WorkRecordPayload } from '#lib/server/db/product.schema.ts';

/**
 * Serialises a value with keys sorted recursively.
 *
 * Signing and verification must produce the same bytes for the same payload, so
 * JSON key order cannot depend on how the object was built or read back from
 * `jsonb`, which does not preserve key order.
 */
export function canonicalJson(value: unknown): string {
	if (Array.isArray(value)) {
		return canonicalArray(value);
	}

	if (isPlainObject(value)) {
		return canonicalObject(value);
	}

	// Numbers, strings, booleans and null have a single JSON spelling.
	return JSON.stringify(value);
}

/** Rebuilds an array without touching the order of its elements. */
function canonicalArray(values: unknown[]): string {
	const entries: string[] = [];

	for (const entry of values) {
		entries.push(canonicalJson(entry));
	}

	// Array order is part of the data, so the elements stay where they are.
	return `[${entries.join(',')}]`;
}

/** Rebuilds an object with its keys sorted, recursing into every value. */
function canonicalObject(record: Record<string, unknown>): string {
	const keys = Object.keys(record).sort();
	const fields: string[] = [];

	for (const key of keys) {
		const value = canonicalJson(record[key]);

		// Stringifying the key keeps quotes and colons inside a key from
		// colliding with the structure of the output.
		fields.push(`${JSON.stringify(key)}:${value}`);
	}

	// Object key order is not part of the data, so it was normalised above.
	return `{${fields.join(',')}}`;
}

/** Narrows to an object that is not an array and not null. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null) {
		return false;
	}

	if (Array.isArray(value)) {
		return false;
	}

	return typeof value === 'object';
}

/** Signs a work-record payload with HMAC-SHA256 and returns lowercase hex. */
export function signWorkRecord(payload: WorkRecordPayload, secret: string): string {
	return createHmac('sha256', secret).update(canonicalJson(payload)).digest('hex');
}

/**
 * Signature format produced by `signWorkRecord`.
 *
 * Bump this when the payload shape or the hashing changes, so existing rows
 * keep verifying under the version they were issued with.
 */
export const CURRENT_SIGNATURE_VERSION = 1;

/**
 * Checks a stored signature against the payload it claims to sign.
 *
 * Comparison is constant time. A malformed signature or an unknown version is
 * simply invalid rather than an error, because the endpoint always answers `200`
 * with `valid: false` for a record whose content no longer matches (AC-46.3).
 */
export function verifyWorkRecordSignature(
	payload: WorkRecordPayload,
	signature: string,
	secret: string,
	version: number
): boolean {
	// A version this build cannot produce has no known hashing rule, so it must
	// fail closed rather than be verified as if it were the current one.
	if (version !== CURRENT_SIGNATURE_VERSION) {
		return false;
	}

	const expected = Buffer.from(signWorkRecord(payload, secret), 'hex');
	const actual = Buffer.from(signature, 'hex');

	// `timingSafeEqual` throws when the lengths differ, and `Buffer.from` turns
	// non-hex text into an empty buffer, so both cases become `false` here.
	if (expected.length !== actual.length) {
		return false;
	}

	return timingSafeEqual(expected, actual);
}
