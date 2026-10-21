import { Resend } from 'resend';
import { EMAIL_FROM_ADDRESS, RESEND_API_KEY } from '$app/env/private';

const resend = new Resend(RESEND_API_KEY);

/**
 * Sends the Better Auth email-verification link through Resend.
 *
 * Better Auth calls this from `sendVerificationEmail`; the caller deliberately
 * does not await it so response timing does not reveal whether an address is
 * already registered.
 */
export async function sendVerificationEmail(to: string, verificationUrl: string) {
	const { error } = await resend.emails.send({
		from: EMAIL_FROM_ADDRESS,
		to,
		subject: 'Verify your Internery email address',
		text: `Verify your email address: ${verificationUrl}`,
		html: `<p>Confirm your email address for Internery.</p><p><a href="${verificationUrl}">Verify email</a></p>`
	});

	if (error) {
		throw new Error(`Resend rejected the verification email: ${error.message}`);
	}
}
