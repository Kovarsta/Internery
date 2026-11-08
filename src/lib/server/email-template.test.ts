import { describe, expect, it } from 'vitest';
import { renderEmailHtml, renderEmailText } from './email-template.ts';

const email = {
	subject: 'Your application was accepted',
	heading: 'Your application was accepted',
	body: 'Acme Coffee accepted your application.',
	actionLabel: 'View your applications',
	actionUrl: 'https://internery.example/me/applications'
};

describe('renderEmailHtml', () => {
	it('renders the heading, body and action', () => {
		const html = renderEmailHtml(email);

		expect(html).toContain('Your application was accepted');
		expect(html).toContain('Acme Coffee accepted your application.');
		expect(html).toContain(`href="${email.actionUrl}"`);
		expect(html).toContain(email.actionLabel);
	});

	it('escapes values that could break the markup', () => {
		const html = renderEmailHtml({
			...email,
			heading: 'Hello <script>',
			body: 'A & B',
			actionUrl: 'https://internery.example/?a=1&b=2'
		});

		expect(html).toContain('Hello &lt;script&gt;');
		expect(html).toContain('A &amp; B');
		expect(html).not.toContain('<script>');
		expect(html).toContain('href="https://internery.example/?a=1&amp;b=2"');
	});
});

describe('renderEmailText', () => {
	it('includes the action and the footer', () => {
		const text = renderEmailText(email);

		expect(text).toContain(email.heading);
		expect(text).toContain(`${email.actionLabel}: ${email.actionUrl}`);
		expect(text).toContain('activity on your Internery account');
	});
});
