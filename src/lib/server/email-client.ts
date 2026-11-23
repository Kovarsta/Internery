/**
 * Resend transport without environment access.
 *
 * The app builds this from `$app/env/private` in `email.ts`; scripts build it
 * from `process.env`, because `$app/env/private` does not exist outside
 * SvelteKit. Keeping the provider call here means both paths share one
 * implementation, and `email-template.ts` stays pure.
 */
import { Resend } from 'resend';
import { renderEmailHtml, renderEmailText, type EmailContent } from './email-template.ts';

/** Credentials for one Resend sender. */
export type EmailSenderConfig = {
	apiKey: string;
	fromAddress: string;
};

/** Sends one prepared email. */
export type EmailSender = (to: string, email: EmailContent) => Promise<void>;

/**
 * Creates a sender for one Resend account.
 *
 * Validation happens per send, so constructing the sender never throws: the app
 * can start without email configured and only fail when it actually sends.
 */
export function createEmailSender(config: EmailSenderConfig): EmailSender {
	return async (to, email) => {
		if (!config.apiKey) {
			throw new Error('RESEND_API_KEY is not set.');
		}

		if (!config.fromAddress) {
			throw new Error('EMAIL_FROM_ADDRESS is not set.');
		}

		if (!isSenderAddress(config.fromAddress)) {
			throw new Error(
				'EMAIL_FROM_ADDRESS must be "Name <email@example.com>" or "email@example.com".'
			);
		}

		const resend = new Resend(config.apiKey);

		const { error } = await resend.emails.send({
			from: config.fromAddress,
			to,
			subject: email.subject,
			text: renderEmailText(email),
			html: renderEmailHtml(email)
		});

		if (error) {
			throw new Error(`Resend rejected the email: ${error.message}`);
		}
	};
}

/** Accepts `email@example.com` and `Name <email@example.com>`. */
function isSenderAddress(value: string): boolean {
	return /^[^<>]+<[^<>@\s]+@[^<>@\s]+>$/.test(value) || /^[^<>@\s]+@[^<>@\s]+$/.test(value);
}
