import { error } from '@sveltejs/kit';
import { apiGet } from '#lib/api/client.ts';
import type { VerifyResult } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Loads `/work-records/[recordId]/verify`.
 *
 * The API answers `200` with `valid: true|false` for an existing public record and `404` for a
 * private or unknown id, so the page never reveals whether a private record exists.
 */
export const load: PageServerLoad = async (event) => {
	if (!UUID_PATTERN.test(event.params.recordId)) {
		error(404, 'That work record does not exist.');
	}

	const result = await apiGet<VerifyResult>(
		event,
		`/api/v1/work-records/${event.params.recordId}/verify`
	);

	return { result };
};
