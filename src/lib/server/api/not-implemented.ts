import { json } from '@sveltejs/kit';

/**
 * Temporary response for API route skeletons.
 *
 * The OpenAPI contract defines no 501 response. Replace each route handler with
 * its real implementation; this helper exists only so the route tree can be
 * exercised before the service layer lands.
 */
export function notImplemented() {
	return json(
		{
			error: {
				code: 'NOT_IMPLEMENTED',
				message: 'This endpoint is not implemented yet.'
			}
		},
		{ status: 501 }
	);
}
