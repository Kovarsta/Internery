/**
 * Sends one preview email through Resend using the production template.
 *
 * Usage: `pnpm email:test you@example.com`
 *
 * Uses `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` from `.env` (the package
 * script passes `--env-file`). The sender must belong to a domain verified in
 * Resend. With a verified domain, the recipient can be any address; in Resend's
 * test mode only the account owner's address is accepted.
 */
import { Resend } from 'resend';
import { renderEmailHtml, renderEmailText, type EmailContent } from '#lib/server/email-template.ts';

const recipient = process.argv[2]?.trim();
const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM_ADDRESS;

if (!recipient) {
	console.error('Usage: pnpm email:test you@example.com');
	process.exit(1);
}

if (!apiKey || !from) {
	console.error('RESEND_API_KEY and EMAIL_FROM_ADDRESS must be set in .env.');
	process.exit(1);
}

// Resend rejects a display name that is not wrapped around the address, for
// example `Internery noreply@example.com` instead of `Internery <noreply@example.com>`.
if (!hasValidSenderFormat(from)) {
	console.error('EMAIL_FROM_ADDRESS must be "Name <email@example.com>" or "email@example.com".');
	process.exit(1);
}

const origin = (process.env.ORIGIN ?? 'http://localhost:3000').replace(/\/$/, '');

const content: EmailContent = {
	subject: 'Your application for "Part-time barista" was accepted',
	heading: 'Your application was accepted',
	body: 'Acme Coffee accepted your application for "Part-time barista". Open Internery to see the next step.',
	actionLabel: 'View your applications',
	actionUrl: `${origin}/me/applications`
};

const resend = new Resend(apiKey);

const { data, error } = await resend.emails.send({
	from,
	to: recipient,
	subject: content.subject,
	text: renderEmailText(content),
	html: renderEmailHtml(content)
});

if (error) {
	console.error(`Resend rejected the email: ${error.message}`);
	process.exit(1);
}

console.log(`Sent to ${recipient}. Resend id: ${data?.id ?? 'unknown'}`);

/** Accepts `email@example.com` and `Name <email@example.com>`. */
function hasValidSenderFormat(value: string): boolean {
	return /^[^<>]+<[^<>@\s]+@[^<>@\s]+>$/.test(value) || /^[^<>@\s]+@[^<>@\s]+$/.test(value);
}
