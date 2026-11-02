import type { RequestEvent, RequestHandler } from './$types';
import { z } from 'zod';
import { isAPIError } from 'better-auth/api';
import { requireActiveAccount } from '#lib/server/api/auth.ts';
import { ApiError, handleApiError } from '#lib/server/api/errors.ts';
import { toUserMe } from '#lib/server/api/mappers.ts';
import { noStoreJson } from '#lib/server/api/responses.ts';
import { parseJson } from '#lib/server/api/validation.ts';
import { auth } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { getUserProfile, updateUserAccount } from '#lib/server/services/users.ts';

const bodySchema = z
	.object({
		fullName: z.string().trim().min(1).max(120).optional(),
		phone: z.string().trim().max(20).nullable().optional(),
		email: z.email().max(255).optional()
	})
	.refine((value) => Object.keys(value).length > 0, {
		message: 'Provide at least one field.'
	});

/** GET /me — getMe */
export const GET: RequestHandler = async (event) => {
	try {
		const user = requireActiveAccount(event.locals);
		const profile = await getUserProfile(db, user.id);

		return noStoreJson(toUserMe(user, profile));
	} catch (error) {
		return handleApiError(error);
	}
};

/** PATCH /me — updateMe */
export const PATCH: RequestHandler = async (event) => {
	try {
		const user = requireActiveAccount(event.locals);
		const input = await parseJson(event.request, bodySchema);

		if (input.email !== undefined && input.email.toLowerCase() !== user.email.toLowerCase()) {
			await requestEmailChange(event, input.email);
		}

		if (input.fullName === undefined && input.phone === undefined) {
			const profile = await getUserProfile(db, user.id);

			return noStoreJson(toUserMe(user, profile));
		}

		const updated = await updateUserAccount(db, user.id, {
			fullName: input.fullName,
			phone: input.phone
		});

		return noStoreJson(toUserMe(updated.user, updated.profile));
	} catch (error) {
		return handleApiError(error);
	}
};

/**
 * Delegates the email change to Better Auth.
 *
 * Better Auth sends the confirmation link to the new address and applies the
 * change when that link is opened. The account keeps its old email until then.
 */
async function requestEmailChange(event: RequestEvent, newEmail: string): Promise<void> {
	try {
		await auth.api.changeEmail({
			body: { newEmail, callbackURL: '/me' },
			headers: event.request.headers
		});
	} catch (error) {
		if (!isAPIError(error)) {
			throw error;
		}

		if (error.status === 400) {
			throw new ApiError('VALIDATION_ERROR', error.message);
		}

		if (error.status === 401) {
			throw new ApiError('UNAUTHENTICATED');
		}

		if (error.status === 403) {
			throw new ApiError('FORBIDDEN');
		}

		if (error.status === 409) {
			throw new ApiError('EMAIL_TAKEN');
		}

		if (error.status === 429) {
			throw new ApiError('RATE_LIMITED');
		}

		throw new ApiError('VALIDATION_ERROR', error.message);
	}
}
