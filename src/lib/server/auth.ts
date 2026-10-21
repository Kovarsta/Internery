import {
	ORIGIN,
	BETTER_AUTH_SECRET,
	GITHUB_CLIENT_ID,
	GITHUB_CLIENT_SECRET
} from '$app/env/private';

import { hash, verify, type Options } from '@node-rs/argon2';
import { and, eq } from 'drizzle-orm';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from '#lib/server/db/index.ts';
import * as schema from '#lib/server/db/schema.ts';
import { sendVerificationEmail } from '#lib/server/email.ts';

const argon2Options: Options = {
	memoryCost: 65536,
	timeCost: 3,
	parallelism: 4,
	outputLen: 32,
	// @node-rs/argon2 exposes Algorithm as a const enum, which cannot be used
	// with the project's verbatimModuleSyntax setting. 2 is Argon2id.
	algorithm: 2
};

export const auth = betterAuth({
	baseURL: ORIGIN,
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema,
		usePlural: true
	}),
	advanced: {
		database: {
			generateId: 'uuid'
		}
	},
	user: {
		additionalFields: {
			role: {
				type: ['STUDENT', 'EMPLOYER', 'ADMIN'],
				required: true,
				defaultValue: 'STUDENT',
				// Authorization data must be set by the server, never by signup input.
				input: false
			},
			status: {
				type: ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'LOCKED', 'DELETED'],
				required: true,
				defaultValue: 'PENDING_VERIFICATION',
				input: false
			}
		}
	},
	databaseHooks: {
		user: {
			create: {
				before: async (user) => ({
					data: {
						...user,
						// GitHub can return an already verified email, so do not
						// leave those accounts stuck in PENDING_VERIFICATION.
						status: user.emailVerified ? 'ACTIVE' : 'PENDING_VERIFICATION'
					}
				}),
				after: async (user) => {
					// Create the common profile eagerly so reads never have to
					// distinguish "no row" from "empty phone/avatar".
					await db.insert(schema.userProfiles).values({ userId: user.id }).onConflictDoNothing();
				}
			}
		}
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		password: {
			hash: (password) => hash(password, argon2Options),
			verify: ({ password, hash: passwordHash }) => verify(passwordHash, password, argon2Options)
		}
	},
	emailVerification: {
		sendVerificationEmail: async ({ user, url }) => {
			// Do not await: response timing must not reveal whether the address exists.
			void sendVerificationEmail(user.email, url).catch((error: unknown) => {
				console.error('Failed to send verification email', error);
			});
		},
		sendOnSignIn: true,
		afterEmailVerification: async (user) => {
			await db
				.update(schema.users)
				.set({ status: 'ACTIVE' })
				.where(and(eq(schema.users.id, user.id), eq(schema.users.status, 'PENDING_VERIFICATION')));
		}
	},
	socialProviders: {
		github: {
			clientId: GITHUB_CLIENT_ID,
			clientSecret: GITHUB_CLIENT_SECRET
		}
	},
	plugins: [
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
