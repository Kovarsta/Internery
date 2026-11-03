import { APIError } from 'better-auth/api';

/**
 * Turns a Better Auth failure into a message the form can show.
 *
 * Better Auth reports expected failures (wrong password, unverified email,
 * duplicate address) as `APIError` with a user-facing body. Anything else is
 * unexpected, so it gets a generic message instead of a stack trace.
 */
export function readAuthMessage(error: unknown): string {
	if (error instanceof APIError) {
		return error.body?.message ?? error.message;
	}

	return 'Something went wrong. Try again.';
}
