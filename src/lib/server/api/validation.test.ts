import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApiError } from './errors.ts';
import { parseJson, parseParams, parseQuery } from './validation.ts';

async function expectApiError(promise: Promise<unknown>): Promise<ApiError> {
	try {
		await promise;
	} catch (error) {
		if (error instanceof ApiError) {
			return error;
		}

		throw error;
	}

	throw new Error('Expected an ApiError.');
}

describe('parseJson', () => {
	const schema = z.object({
		name: z.string().min(1),
		count: z.number().int().positive()
	});

	it('returns parsed JSON', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({ name: 'CV', count: 2 })
		});

		await expect(parseJson(request, schema)).resolves.toEqual({ name: 'CV', count: 2 });
	});

	it('rejects malformed JSON', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			body: 'not json'
		});
		const error = await expectApiError(parseJson(request, schema));

		expect(error.code).toBe('VALIDATION_ERROR');
	});

	it('reports each invalid field', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({ name: '', count: 0 })
		});
		const error = await expectApiError(parseJson(request, schema));

		expect(error.details?.map((detail) => detail.field)).toEqual(['name', 'count']);
		expect(error.details?.every((detail) => detail.message.length > 0)).toBe(true);
	});
});

describe('parseParams', () => {
	it('validates route parameters', () => {
		const schema = z.object({ jobId: z.string().uuid() });
		const params = { jobId: '8f14e45f-ceea-4f15-9c0f-2d1d3e5c9a11' };

		expect(parseParams(params, schema)).toEqual(params);
	});

	it('rejects invalid route parameters', async () => {
		const schema = z.object({ jobId: z.string().uuid() });
		const error = await expectApiError(
			Promise.resolve().then(() => parseParams({ jobId: 'bad' }, schema))
		);

		expect(error.code).toBe('VALIDATION_ERROR');
		expect(error.details?.[0].field).toBe('jobId');
	});
});

describe('parseQuery', () => {
	it('parses query values through the schema', () => {
		const schema = z.object({ page: z.coerce.number().int().min(1) });
		const url = new URL('http://localhost?page=2');

		expect(parseQuery(url, schema)).toEqual({ page: 2 });
	});
});
