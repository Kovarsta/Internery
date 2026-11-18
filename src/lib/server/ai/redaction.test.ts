import { describe, expect, it } from 'vitest';
import { redactCvText, type CvIdentity } from './redaction.ts';

const identity: CvIdentity = {
	fullName: 'Nguyen Van An',
	email: 'an.nguyen@example.com',
	phone: '090 123 4567'
};

describe('redactCvText', () => {
	it('removes every email address', () => {
		const text = 'Contact an.nguyen@example.com or an@student.edu.vn for details.';

		expect(redactCvText(text, identity)).toBe('Contact [email] or [email] for details.');
	});

	it('removes Vietnamese phone numbers in common formats', () => {
		const text = [
			'Mobile: 090 123 4567',
			'International: +84 90 123 4567',
			'Landline: (028) 3822 1234'
		].join('\n');

		const redacted = redactCvText(text, identity);

		expect(redacted).not.toContain('090');
		expect(redacted).not.toContain('1234');
		expect(redacted.match(/\[phone\]/g)).toHaveLength(3);
	});

	it('removes the full name regardless of case and spacing', () => {
		const text = 'NGUYEN VAN AN\nnguyen   van an\nNguyen Van An';

		expect(redactCvText(text, identity)).toBe('[name]\n[name]\n[name]');
	});

	it('keeps words that merely contain the name', () => {
		const text = 'Anh Nguyen worked with Nguyen Van Anh at the shop.';

		// "Anh" is not the student, and the boundary prevents a partial match.
		expect(redactCvText(text, identity)).toBe('Anh Nguyen worked with Nguyen Van Anh at the shop.');
	});

	it('keeps unrelated words from the CV', () => {
		const text = 'Two years of customer service at a coffee shop in District 1.';

		expect(redactCvText(text, identity)).toBe(text);
	});

	it('removes a profile phone even when the pattern does not match', () => {
		const text = 'Call 0901234567 today.';

		expect(redactCvText(text, { fullName: '', email: '', phone: '0901234567' })).toBe(
			'Call [phone] today.'
		);
	});
});
