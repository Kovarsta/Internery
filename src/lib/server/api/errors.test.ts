import { describe, expect, it, vi } from 'vitest';
import { ApiError, DomainError, handleApiError, type ErrorResponse } from './errors.ts';

async function readErrorResponse(response: Response): Promise<ErrorResponse> {
	return (await response.json()) as ErrorResponse;
}

describe('handleApiError', () => {
	it('maps an ApiError to its response status', async () => {
		const response = handleApiError(new ApiError('FORBIDDEN'));
		const body = await readErrorResponse(response);

		expect(response.status).toBe(403);
		expect(body.error.code).toBe('FORBIDDEN');
		expect(body.error.requestId).toBeTruthy();
	});

	it('keeps validation details', async () => {
		const response = handleApiError(
			new ApiError('VALIDATION_ERROR', 'Request validation failed.', [
				{ field: 'title', message: 'Required' }
			])
		);
		const body = await readErrorResponse(response);

		expect(response.status).toBe(422);
		expect(body.error.details).toEqual([{ field: 'title', message: 'Required' }]);
	});

	it('maps a DomainError to its response status', async () => {
		const response = handleApiError(new DomainError('POSITIONS_FULL'));
		const body = await readErrorResponse(response);

		expect(response.status).toBe(409);
		expect(body.error.code).toBe('POSITIONS_FULL');
	});

	it('hides unknown errors and logs them', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const response = handleApiError(new Error('database password is secret'));
		const body = await readErrorResponse(response);

		expect(response.status).toBe(500);
		expect(body.error.code).toBe('INTERNAL_ERROR');
		expect(body.error.message).not.toContain('secret');
		expect(log).toHaveBeenCalledOnce();

		log.mockRestore();
	});
});
