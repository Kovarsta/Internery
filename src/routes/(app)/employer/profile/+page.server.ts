import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Old company-profile URL.
 *
 * The page moved into the account area at `/me/company-profile`; this keeps
 * existing links and previously sent emails working.
 */
export const load: PageServerLoad = () => {
	redirect(307, '/me/company-profile');
};
