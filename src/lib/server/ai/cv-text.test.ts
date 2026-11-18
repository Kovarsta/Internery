import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	CvUnreadableError,
	comparableCvText,
	extractCvText,
	hashCvText,
	limitCvText,
	normaliseCvText,
	quoteAppearsInCv
} from './cv-text.ts';

const fixturePath = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

const pdfFixture = readFileSync(fixturePath('cv.pdf'));
const docxFixture = readFileSync(fixturePath('cv.docx'));

describe('extractCvText', () => {
	it('extracts the text of a text-based PDF', async () => {
		const text = await extractCvText({
			bytes: pdfFixture,
			fileName: 'cv.pdf',
			mimeType: 'application/pdf'
		});

		expect(text).toContain('Nguyen Van An');
		expect(text).toContain('customer service at a coffee shop');
	});

	it('extracts the text of a DOCX', async () => {
		const text = await extractCvText({
			bytes: docxFixture,
			fileName: 'cv.docx',
			mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
		});

		expect(text).toContain('Nguyen Van An');
		expect(text).toContain('Skills: English communication, POS, teamwork.');
	});

	it('detects the format from the extension when the media type is missing', async () => {
		const text = await extractCvText({
			bytes: docxFixture,
			fileName: 'resume.DOCX',
			mimeType: null
		});

		expect(text).toContain('customer service');
	});

	it('rejects a format the AI cannot read', async () => {
		await expect(
			extractCvText({ bytes: Buffer.from('hello'), fileName: 'cv.txt', mimeType: 'text/plain' })
		).rejects.toMatchObject({ reason: 'unsupported' });
	});

	it('rejects a PDF with no readable text', async () => {
		// A structurally valid but empty PDF has no text layer.
		const emptyPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');

		await expect(
			extractCvText({ bytes: emptyPdf, fileName: 'cv.pdf', mimeType: 'application/pdf' })
		).rejects.toBeInstanceOf(CvUnreadableError);
	});
});

describe('normaliseCvText', () => {
	it('normalises line endings, trailing spaces and blank runs', () => {
		expect(normaliseCvText('  Name  \r\n\r\n\r\nLine\t\r\n')).toBe('Name\n\nLine');
	});
});

describe('comparableCvText', () => {
	it('removes markdown markers and collapses whitespace', () => {
		expect(comparableCvText('# Skills\n\n- **Customer**   service')).toBe(
			'skills customer service'
		);
	});
});

describe('quoteAppearsInCv', () => {
	const cvText = '# Experience\n\n**Customer service** at a coffee shop.';

	it('matches a quote that differs only in markdown and whitespace', () => {
		expect(quoteAppearsInCv('Customer service at a coffee shop', cvText)).toBe(true);
	});

	it('rejects a quote that is not in the CV', () => {
		expect(quoteAppearsInCv('Managed a team of twelve engineers', cvText)).toBe(false);
	});

	it('rejects an empty quote', () => {
		expect(quoteAppearsInCv('   ', cvText)).toBe(false);
	});
});

describe('hashCvText', () => {
	it('returns a SHA-256 hex digest', () => {
		expect(hashCvText('customer service')).toMatch(/^[0-9a-f]{64}$/);
	});

	it('ignores whitespace differences that normalisation removes', () => {
		expect(hashCvText('Line one\r\nLine two  ')).toBe(hashCvText('Line one\nLine two'));
	});

	it('changes when the text changes', () => {
		expect(hashCvText('customer service')).not.toBe(hashCvText('customer support'));
	});
});

describe('limitCvText', () => {
	it('leaves short text alone', () => {
		expect(limitCvText('short')).toBe('short');
	});

	it('caps long text', () => {
		expect(limitCvText('x'.repeat(25_000))).toHaveLength(20_000);
	});
});
