/**
 * Pagination for list endpoints, following the `page`/`pageSize` contract.
 *
 * `parsePagination` reads the request. `paged` writes the response. A handler
 * uses both and passes `limit`/`offset` to the service:
 *
 * @example
 * ```ts
 * const pagination = parsePagination(event.url);
 *
 * const { items, total } = await listJobs(db, {
 * 	limit: pagination.pageSize,
 * 	offset: pagination.offset
 * });
 *
 * return Response.json(paged(items.map(toJobSummary), total, pagination));
 * ```
 */

import { ApiError } from './errors.ts';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export type Pagination = {
	page: number;
	pageSize: number;
	offset: number;
};

export type PagedResult<T> = {
	items: T[];
	page: number;
	pageSize: number;
	total: number;
};

/**
 * Reads `page` and `pageSize` from a URL.
 *
 * Missing values use the contract defaults. Non-integers and values outside
 * the allowed range become validation errors.
 */
export function parsePagination(url: URL): Pagination {
	const page = parsePositiveInteger(url.searchParams.get('page'), 'page', 1);
	const pageSize = parsePositiveInteger(
		url.searchParams.get('pageSize'),
		'pageSize',
		DEFAULT_PAGE_SIZE
	);

	if (pageSize > MAX_PAGE_SIZE) {
		throw new ApiError('VALIDATION_ERROR', 'Request validation failed.', [
			{
				field: 'pageSize',
				message: `pageSize must be at most ${MAX_PAGE_SIZE}.`
			}
		]);
	}

	return {
		page,
		pageSize,
		offset: (page - 1) * pageSize
	};
}

/** Builds the paged response shape shared by list endpoints. */
export function paged<T>(items: T[], total: number, pagination: Pagination): PagedResult<T> {
	return {
		items,
		page: pagination.page,
		pageSize: pagination.pageSize,
		total
	};
}

function parsePositiveInteger(value: string | null, field: string, fallback: number): number {
	if (value === null) {
		return fallback;
	}

	const parsed = Number(value);

	if (!Number.isInteger(parsed) || parsed < 1) {
		throw new ApiError('VALIDATION_ERROR', 'Request validation failed.', [
			{
				field,
				message: `${field} must be a positive integer.`
			}
		]);
	}

	return parsed;
}
