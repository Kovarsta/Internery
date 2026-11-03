import { apiGet } from '#lib/api/client.ts';
import type { AccountStatus, AdminUser, Paged, UserRole } from '#lib/api/types.ts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 20;

const ROLES: UserRole[] = ['STUDENT', 'EMPLOYER', 'ADMIN'];
const STATUSES: AccountStatus[] = [
	'PENDING_VERIFICATION',
	'ACTIVE',
	'SUSPENDED',
	'LOCKED',
	'DELETED'
];

/**
 * Loads `/admin/users`.
 *
 * The search text, role and status stay in the URL so a page of results can be
 * shared or reloaded. Unknown filter values are dropped rather than sent to the
 * API.
 */
export const load: PageServerLoad = async (event) => {
	const query = event.url.searchParams;
	const search = (query.get('q') ?? '').trim();
	const role = readRole(query.get('role'));
	const status = readStatus(query.get('status'));
	const page = readPage(query.get('page'));

	const filters = new URLSearchParams({ pageSize: String(PAGE_SIZE), page: String(page) });

	if (search !== '') {
		filters.set('q', search);
	}

	if (role) {
		filters.set('role', role);
	}

	if (status) {
		filters.set('status', status);
	}

	const users = await apiGet<Paged<AdminUser>>(event, `/api/v1/admin/users?${filters}`);

	const filterQuery = new URLSearchParams();

	if (search !== '') {
		filterQuery.set('q', search);
	}

	if (role) {
		filterQuery.set('role', role);
	}

	if (status) {
		filterQuery.set('status', status);
	}

	return {
		users,
		search,
		role: role ?? '',
		status: status ?? '',
		filterQuery: filterQuery.toString()
	};
};

function readRole(value: string | null): UserRole | null {
	return ROLES.find((role) => role === value) ?? null;
}

function readStatus(value: string | null): AccountStatus | null {
	return STATUSES.find((status) => status === value) ?? null;
}

function readPage(value: string | null): number {
	const page = Number(value ?? '1');

	return Number.isInteger(page) && page > 0 ? page : 1;
}
