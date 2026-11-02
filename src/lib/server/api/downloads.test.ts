import { describe, expect, it } from 'vitest';
import type { StoredObject } from '#lib/server/storage/client.ts';
import { contentDisposition, fileDownload } from './downloads.ts';

function storedObject(overrides: Partial<StoredObject> = {}): StoredObject {
	return {
		body: new ReadableStream(),
		contentType: 'application/pdf',
		etag: null,
		contentLength: 12,
		...overrides
	};
}

describe('contentDisposition', () => {
	it('keeps a plain ASCII name in both forms', () => {
		expect(contentDisposition('resume.pdf')).toBe(
			`attachment; filename="resume.pdf"; filename*=UTF-8''resume.pdf`
		);
	});

	it('encodes a Vietnamese name for the filename* form', () => {
		const header = contentDisposition('Nguyễn Văn An.pdf');

		expect(header).toContain(`filename="Nguy_n V_n An.pdf"`);
		expect(header).toContain(`filename*=UTF-8''Nguy%E1%BB%85n%20V%C4%83n%20An.pdf`);
	});

	it('strips characters that could break the header', () => {
		const header = contentDisposition('bad"name\r\nInjected: yes.pdf');

		expect(header).not.toContain('\r');
		expect(header).not.toContain('\n');
		expect(header).toContain('filename="bad_name__Injected: yes.pdf"');
	});
});

describe('fileDownload', () => {
	it('marks the file private and uncached', () => {
		const response = fileDownload(storedObject(), 'resume.pdf');

		expect(response.headers.get('Content-Type')).toBe('application/pdf');
		expect(response.headers.get('Cache-Control')).toBe('private, no-store');
		expect(response.headers.get('Content-Length')).toBe('12');
		expect(response.headers.get('Content-Disposition')).toContain('resume.pdf');
	});

	it('falls back to a generic content type', () => {
		const response = fileDownload(storedObject({ contentType: null }), 'resume.pdf');

		expect(response.headers.get('Content-Type')).toBe('application/octet-stream');
	});
});
