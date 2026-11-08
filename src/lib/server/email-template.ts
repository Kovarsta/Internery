/**
 * Email content and rendering.
 *
 * Pure functions with no provider or environment access, so the same template
 * can be unit-tested, rendered by the preview script and sent by `email.ts`.
 */

export type EmailContent = {
	subject: string;
	heading: string;
	body: string;
	actionLabel: string;
	actionUrl: string;
};

/** Plain-text alternative for clients that block HTML. */
export function renderEmailText(email: EmailContent): string {
	return [
		email.heading,
		'',
		email.body,
		'',
		`${email.actionLabel}: ${email.actionUrl}`,
		'',
		'You are receiving this because of activity on your Internery account.',
		'Internery - Part-time work for students in Vietnam'
	].join('\n');
}

/**
 * The shared email shell.
 *
 * Inline styles and presentation tables, because email clients strip `<style>`
 * and do not support modern layout consistently.
 */
export function renderEmailHtml(email: EmailContent): string {
	const heading = escapeHtml(email.heading);
	const body = escapeHtml(email.body);
	const actionLabel = escapeHtml(email.actionLabel);
	const actionUrl = escapeHtml(email.actionUrl);

	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>${heading}</title>
	</head>
	<body style="margin:0;padding:0;background-color:#f5f6f2;color:#17211b;font-family:Arial,Helvetica,sans-serif;">
		<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${heading}</div>
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f6f2;">
			<tr>
				<td align="center" style="padding:32px 16px;">
					<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
						<tr>
							<td style="padding:0 4px 16px;">
								<span style="font-size:20px;font-weight:800;letter-spacing:-0.02em;color:#17211b;">Internery</span>
							</td>
						</tr>
						<tr>
							<td style="background-color:#ffffff;border:1px solid #d8ddd6;border-top:4px solid #1e5b43;border-radius:8px;padding:28px;">
								<h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#17211b;">${heading}</h1>
								<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#44514a;">${body}</p>
								<a href="${actionUrl}" style="display:inline-block;background-color:#1e5b43;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:15px;font-weight:600;">${actionLabel}</a>
							</td>
						</tr>
						<tr>
							<td style="padding:20px 4px 0;font-size:12px;line-height:1.6;color:#6b7770;">
								You are receiving this because of activity on your Internery account.<br />
								Internery - Part-time work for students in Vietnam
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</body>
</html>`;
}

/** Escapes the five characters that can break out of HTML text or an attribute. */
function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}
