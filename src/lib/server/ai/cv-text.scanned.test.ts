import { describe, expect, it, vi } from 'vitest';
import { CvUnreadableError, extractCvText } from './cv-text.ts';

/**
 * The classification is mocked so this test does not need a real scan.
 *
 * The point is our decision: `Scanned` and `ImageBased` are rejected before any
 * text extraction, not handed to the model.
 */
vi.mock('@firecrawl/pdf-inspector', () => ({
	classifyPdfAsync: async () => ({
		pdfType: 'Scanned',
		pageCount: 1,
		pagesNeedingOcr: [0],
		confidence: 0.98
	}),
	extractPagesMarkdownAsync: async () => ({ pages: [] })
}));

describe('extractCvText with a scanned PDF', () => {
	it('rejects a scanned document without extracting text', async () => {
		const result = extractCvText({
			bytes: Buffer.from('%PDF-1.4'),
			fileName: 'scan.pdf',
			mimeType: 'application/pdf'
		});

		await expect(result).rejects.toBeInstanceOf(CvUnreadableError);
		await expect(result).rejects.toMatchObject({ reason: 'scanned' });
	});
});
