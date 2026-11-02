import { describe, expect, it } from 'vitest';
import { noStoreJson } from './responses.ts';

describe('noStoreJson', () => {
	it('marks the response as not storable', async () => {
		const response = noStoreJson({ id: 'user-1' });

		expect(response.status).toBe(200);
		expect(response.headers.get('Cache-Control')).toBe('no-store');
		expect(await response.json()).toEqual({ id: 'user-1' });
	});

	it('keeps a status and merges other headers', () => {
		const response = noStoreJson(
			{ id: 'user-1' },
			{ status: 201, headers: { 'X-Request-Id': 'abc' } }
		);

		expect(response.status).toBe(201);
		expect(response.headers.get('Cache-Control')).toBe('no-store');
		expect(response.headers.get('X-Request-Id')).toBe('abc');
	});
});
