import { describe, expect, it } from 'vitest';
import { ApiError } from './errors.ts';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, paged, parsePagination } from './pagination.ts';

function expectApiError(action: () => unknown): ApiError {
	try {
		action();
	} catch (error) {
		if (error instanceof ApiError) {
			return error;
		}

		throw error;
	}

	throw new Error('Expected an ApiError.');
}

describe('parsePagination', () => {
	it('uses the contract defaults', () => {
		expect(parsePagination(new URL('http://localhost'))).toEqual({
			page: 1,
			pageSize: DEFAULT_PAGE_SIZE,
			offset: 0
		});
	});

	it('reads page and pageSize', () => {
		expect(parsePagination(new URL('http://localhost?page=3&pageSize=10'))).toEqual({
			page: 3,
			pageSize: 10,
			offset: 20
		});
	});

	it('rejects a non-positive page', () => {
		const error = expectApiError(() => parsePagination(new URL('http://localhost?page=0')));

		expect(error.details?.[0].field).toBe('page');
	});

	it('rejects a pageSize above the maximum', () => {
		const error = expectApiError(() =>
			parsePagination(new URL(`http://localhost?pageSize=${MAX_PAGE_SIZE + 1}`))
		);

		expect(error.details?.[0].field).toBe('pageSize');
	});
});

describe('paged', () => {
	it('builds the shared paged response shape', () => {
		expect(paged(['a', 'b'], 7, { page: 2, pageSize: 2, offset: 2 })).toEqual({
			items: ['a', 'b'],
			page: 2,
			pageSize: 2,
			total: 7
		});
	});
});
