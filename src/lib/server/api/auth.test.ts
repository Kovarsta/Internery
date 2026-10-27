import { describe, expect, it } from 'vitest';
import { ApiError } from './errors.ts';
import { requireActiveAccount, requireRole, requireUser } from './auth.ts';

type SessionUser = NonNullable<App.Locals['user']>;

const baseUser = {
	id: '8f14e45f-ceea-4f15-9c0f-2d1d3e5c9a11',
	email: 'student@example.com',
	name: 'Student',
	emailVerified: true,
	image: null,
	createdAt: new Date('2026-01-01T00:00:00Z'),
	updatedAt: new Date('2026-01-01T00:00:00Z'),
	role: 'STUDENT',
	status: 'ACTIVE'
} as SessionUser;

function makeLocals(overrides: Partial<SessionUser> = {}): App.Locals {
	return {
		user: {
			...baseUser,
			...overrides
		}
	};
}

function expectApiError(action: () => unknown): ApiError {
	try {
		action();
	} catch (error) {
		if (error instanceof ApiError) {
			return error;
		}

		throw error;
	}

	throw new Error('Expected an ApiError.');
}

describe('requireUser', () => {
	it('returns the signed-in user', () => {
		expect(requireUser(makeLocals())).toEqual(baseUser);
	});

	it('rejects a signed-out request', () => {
		const error = expectApiError(() => requireUser({}));

		expect(error.code).toBe('UNAUTHENTICATED');
	});
});

describe('requireRole', () => {
	it('accepts an allowed role', () => {
		expect(requireRole(makeLocals({ role: 'EMPLOYER' }), ['EMPLOYER']).role).toBe('EMPLOYER');
	});

	it('rejects a different role', () => {
		const error = expectApiError(() => requireRole(makeLocals({ role: 'STUDENT' }), ['EMPLOYER']));

		expect(error.code).toBe('FORBIDDEN');
	});
});

describe('requireActiveAccount', () => {
	it('accepts an active account', () => {
		expect(requireActiveAccount(makeLocals()).status).toBe('ACTIVE');
	});

	it('rejects a locked account', () => {
		const error = expectApiError(() => requireActiveAccount(makeLocals({ status: 'LOCKED' })));

		expect(error.code).toBe('ACCOUNT_LOCKED');
	});
});
