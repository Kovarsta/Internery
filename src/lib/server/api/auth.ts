import { ApiError } from './errors.ts';

export type CurrentUser = NonNullable<App.Locals['user']>;
export type UserRole = 'STUDENT' | 'EMPLOYER' | 'ADMIN';

/** Returns the signed-in user or rejects the request with 401. */
export function requireUser(locals: App.Locals): CurrentUser {
	if (!locals.user) {
		throw new ApiError('UNAUTHENTICATED');
	}

	return locals.user;
}

/** Returns the signed-in user when their role is allowed, otherwise rejects with 403. */
export function requireRole(locals: App.Locals, allowedRoles: readonly UserRole[]): CurrentUser {
	const user = requireActiveAccount(locals);

	if (!allowedRoles.includes(user.role as UserRole)) {
		throw new ApiError('FORBIDDEN');
	}

	return user;
}

/**
 * Rejects accounts that may no longer use the API.
 *
 * A temporary login lockout is handled separately through `lockedUntil`; this
 * guard is for the account lifecycle states.
 */
export function requireActiveAccount(locals: App.Locals): CurrentUser {
	const user = requireUser(locals);

	if (user.status === 'LOCKED' || user.status === 'SUSPENDED' || user.status === 'DELETED') {
		throw new ApiError('ACCOUNT_LOCKED');
	}

	return user;
}
