import { fail, redirect } from '@sveltejs/kit';
import { auth } from '#lib/server/auth.ts';
import { readAuthMessage } from '#lib/server/auth-errors.ts';
import { db } from '#lib/server/db/index.ts';
import { assignSignupRole } from '#lib/server/services/users.ts';
import type { Actions, PageServerLoad } from './$types';

const SIGNUP_ROLES = ['STUDENT', 'EMPLOYER'] as const;
type SignupRole = (typeof SIGNUP_ROLES)[number];

/**
 * Create account (`/register`).
 *
 * Better Auth creates the user and sends the verification email. The role is
 * set afterwards because Better Auth marks `role` as server-owned, and the
 * account cannot sign in until the address is verified.
 */
export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) {
		redirect(303, '/me');
	}

	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const name = readText(form.get('name'));
		const email = readText(form.get('email'));
		const password = readText(form.get('password'));
		const role = readRole(form.get('role'));

		if (!name || !email || !password) {
			return fail(400, { name, email, role, message: 'Fill in every field.' });
		}

		if (!role) {
			return fail(400, { name, email, role, message: 'Choose student or employer.' });
		}

		try {
			const user = await auth.api.signUpEmail({
				body: { name, email, password },
				headers: event.request.headers
			});

			await assignSignupRole(db, user.user.id, role);
		} catch (error) {
			return fail(400, { name, email, role, message: readAuthMessage(error) });
		}

		redirect(303, '/login?registered=1');
	}
};

function readText(value: FormDataEntryValue | null): string {
	return typeof value === 'string' ? value.trim() : '';
}

/** Keeps the role inside the two values a visitor may choose. */
function readRole(value: FormDataEntryValue | null): SignupRole | null {
	if (value === 'STUDENT' || value === 'EMPLOYER') {
		return value;
	}

	return null;
}
