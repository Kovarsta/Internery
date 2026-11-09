import { apiGet } from '#lib/api/client.ts';
import type { UserMe } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

/** Loads the account summary from `GET /me`. */
export const load: PageServerLoad = async (event) => {
	const me = await apiGet<UserMe>(event, '/api/v1/me');

	return { me };
};
