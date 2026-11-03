import { apiGet, apiGetOptional } from '#lib/api/client.ts';
import type { EmployerProfile, VerificationRequest } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

/**
 * Loads `/me/verification`.
 *
 * The employer profile carries the badge state, and the latest request carries the outcome and
 * rejection reason. An employer who never applied has no request, which the API reports as `404`
 * and the load turns into `null`.
 */
export const load: PageServerLoad = async (event) => {
	const [profile, request] = await Promise.all([
		apiGet<EmployerProfile>(event, '/api/v1/me/employer-profile'),
		apiGetOptional<VerificationRequest>(event, '/api/v1/me/verification-request')
	]);

	return { profile, request };
};
