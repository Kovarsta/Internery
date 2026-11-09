import { Resend } from 'resend';
import { EMAIL_FROM_ADDRESS, RESEND_API_KEY } from '$app/env/private';
import { renderEmailHtml, renderEmailText, type EmailContent } from '#lib/server/email-template.ts';

export type { EmailContent } from '#lib/server/email-template.ts';

/**
 * Sends one email through Resend.
 *
 * This is the only function that talks to the provider. Event-specific senders
 * build `EmailContent` and call this.
 *
 * Skipped in tests so service tests never call the provider. Throws when the
 * provider rejects the message; callers that must not fail the request catch it.
 */
export async function sendEmail(to: string, email: EmailContent): Promise<void> {
	if (process.env.NODE_ENV === 'test') {
		return;
	}

	if (!RESEND_API_KEY) {
		throw new Error('RESEND_API_KEY is not set.');
	}

	if (!EMAIL_FROM_ADDRESS) {
		throw new Error('EMAIL_FROM_ADDRESS is not set.');
	}

	if (!isSenderAddress(EMAIL_FROM_ADDRESS)) {
		throw new Error(
			'EMAIL_FROM_ADDRESS must be "Name <email@example.com>" or "email@example.com".'
		);
	}

	const resend = new Resend(RESEND_API_KEY);

	const { error } = await resend.emails.send({
		from: EMAIL_FROM_ADDRESS,
		to,
		subject: email.subject,
		text: renderEmailText(email),
		html: renderEmailHtml(email)
	});

	if (error) {
		throw new Error(`Resend rejected the email: ${error.message}`);
	}
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

/** Accepts `email@example.com` and `Name <email@example.com>`. */
function isSenderAddress(value: string): boolean {
	return /^[^<>]+<[^<>@\s]+@[^<>@\s]+>$/.test(value) || /^[^<>@\s]+@[^<>@\s]+$/.test(value);
}
