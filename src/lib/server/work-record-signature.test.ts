import { describe, expect, it } from 'vitest';
import type { WorkRecordPayload } from '#lib/server/db/product.schema.ts';
import {
	canonicalJson,
	signWorkRecord,
	verifyWorkRecordSignature
} from './work-record-signature.ts';

const payload: WorkRecordPayload = {
	recordId: 'a1b2c3d4-0000-4000-8000-000000000001',
	studentName: 'Le Van An',
	employerName: 'Acme Coffee',
	jobTitle: 'Part-time barista',
	startDate: '2026-01-05',
	endDate: '2026-02-28',
	rating: 5,
	comment: null,
	issuedAt: '2026-03-01T09:00:00.000Z'
};

// Fixed value so a change to key ordering or hashing is caught immediately.
const expectedSignature = 'ce02f029d83fc3a9f61153a5e25d3a455950b5a7613bbd08e4c76c3f167f8bb3';

describe('canonicalJson', () => {
	it('sorts object keys at every level', () => {
		expect(canonicalJson({ b: 1, a: { d: 2, c: [3, { f: 4, e: 5 }] } })).toBe(
			'{"a":{"c":[3,{"e":5,"f":4}],"d":2},"b":1}'
		);
	});

	it('keeps array order', () => {
		expect(canonicalJson(['b', 'a'])).toBe('["b","a"]');
	});

	it('serialises primitives and null like JSON', () => {
		expect(canonicalJson(null)).toBe('null');
		expect(canonicalJson(42)).toBe('42');
		expect(canonicalJson('x')).toBe('"x"');
	});
});

describe('signWorkRecord', () => {
	it('produces a stable HMAC over the canonical payload', () => {
		expect(signWorkRecord(payload, 'test-secret')).toBe(expectedSignature);
	});

	it('does not depend on the key insertion order', () => {
		const reordered = { ...payload } as Record<string, unknown>;
		const shuffled = Object.fromEntries(Object.entries(reordered).reverse()) as WorkRecordPayload;

		expect(signWorkRecord(shuffled, 'test-secret')).toBe(expectedSignature);
	});
});

describe('verifyWorkRecordSignature', () => {
	it('accepts a matching signature', () => {
		expect(verifyWorkRecordSignature(payload, expectedSignature, 'test-secret')).toBe(true);
	});

	it('rejects a changed payload', () => {
		expect(
			verifyWorkRecordSignature({ ...payload, rating: 4 }, expectedSignature, 'test-secret')
		).toBe(false);
	});

	it('rejects a wrong secret', () => {
		expect(verifyWorkRecordSignature(payload, expectedSignature, 'other-secret')).toBe(false);
	});

	it('rejects a malformed signature without throwing', () => {
		expect(verifyWorkRecordSignature(payload, 'not-hex', 'test-secret')).toBe(false);
	});
});
