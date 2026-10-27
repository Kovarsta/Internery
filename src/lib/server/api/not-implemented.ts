import { ApiError, handleApiError } from './errors.ts';

/**
 * Temporary response for API route skeletons.
 *
 * The OpenAPI contract defines no 501 response. Replace each route handler with
 * its real implementation; this helper exists only so the route tree can be
 * exercised before the service layer lands.
 */
export function notImplemented() {
	return handleApiError(new ApiError('NOT_IMPLEMENTED', 'This endpoint is not implemented yet.'));
}
