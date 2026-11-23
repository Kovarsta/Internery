import { EMAIL_FROM_ADDRESS, RESEND_API_KEY } from '$app/env/private';
import { createEmailSender } from '#lib/server/email-client.ts';
import type { EmailContent } from '#lib/server/email-template.ts';

export type { EmailContent } from '#lib/server/email-template.ts';

const sender = createEmailSender({ apiKey: RESEND_API_KEY, fromAddress: EMAIL_FROM_ADDRESS });

/**
 * Sends one email through Resend.
 *
 * This is the only function the app uses to talk to the provider. Event-specific
 * senders build `EmailContent` and call this.
 *
 * Skipped in tests so service tests never call the provider. Throws when the
 * provider rejects the message; callers that must not fail the request catch it.
 */
export async function sendEmail(to: string, email: EmailContent): Promise<void> {
	if (process.env.NODE_ENV === 'test') {
		return;
	}

	await sender(to, email);
}

/**
 * Sends the Better Auth verification link.
 *
 * Better Auth calls this from `sendVerificationEmail`; a rejection is thrown so
 * the auth flow can surface it.
 */
export async function sendVerificationEmail(to: string, verificationUrl: string) {
	await sendEmail(to, {
		subject: 'Verify your Internery email address',
		heading: 'Confirm your email address',
		body: 'Finish setting up your Internery account by confirming this address.',
		actionLabel: 'Verify email',
		actionUrl: verificationUrl
	});
}

/**
 * Sends the Better Auth password-reset link.
 *
 * The token is one-time and expires after one hour. The message deliberately
 * says nothing about whether the account exists; the request form shows the
 * same result either way.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string) {
	await sendEmail(to, {
		subject: 'Reset your Internery password',
		heading: 'Choose a new password',
		body: 'Use the button below to set a new password for your Internery account. The link expires in one hour. If you did not ask for this, you can ignore this email.',
		actionLabel: 'Reset password',
		actionUrl: resetUrl
	});
}

