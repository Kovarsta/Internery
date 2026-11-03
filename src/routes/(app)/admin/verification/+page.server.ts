import { apiGet } from '#lib/api/client.ts';
import type { Paged, VerificationRequest, VerificationRequestStatus } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 20;
const STATUSES: VerificationRequestStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

/**
 * Loads `/admin/verification`.
 *
 * The queue defaults to the pending requests, because those are the ones that
 * need a decision. `status=ALL` shows the decided history too.
 */
export const load: PageServerLoad = async (event) => {
	const requested = event.url.searchParams.get('status');
	const status = readStatus(requested);
	const requestedPage = Number(event.url.searchParams.get('page') ?? '1');
	const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

	const query = new URLSearchParams({ pageSize: String(PAGE_SIZE), page: String(page) });

	if (status !== null) {
		query.set('status', status);
	}

	const requests = await apiGet<Paged<VerificationRequest>>(
		event,
		`/api/v1/admin/verification-requests?${query}`
	);

	const filterQuery = status === null ? 'status=ALL' : `status=${status}`;

	return { requests, status: status ?? 'ALL', filterQuery };
};

function readStatus(value: string | null): VerificationRequestStatus | null {
	if (value === 'ALL') {
		return null;
	}

	if (value === null) {
		return 'PENDING';
	}

	return STATUSES.find((status) => status === value) ?? 'PENDING';
}
