import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { MAX_AVATAR_BYTES, MAX_CV_BYTES, readAvatarImage, readCvFile } from './uploads.ts';

/** Builds a real image so the decoder has something valid to read. */
async function imageFixture(width: number, height: number, format: 'png' | 'jpeg') {
	const pipeline = sharp({
		create: { width, height, channels: 3, background: { r: 51, g: 102, b: 153 } }
	});

	return format === 'png' ? pipeline.png().toBuffer() : pipeline.jpeg().toBuffer();
}

describe('readAvatarImage', () => {
	it('normalises a PNG to a square WebP', async () => {
		const input = await imageFixture(1024, 768, 'png');
		const image = await readAvatarImage(new File([input], 'avatar.png'));

		expect(image.contentType).toBe('image/webp');
		expect(image.extension).toBe('webp');

		const metadata = await sharp(image.bytes).metadata();

		expect(metadata.format).toBe('webp');
		expect(metadata.width).toBe(512);
		expect(metadata.height).toBe(512);
	});

	it('detects a JPEG even when the client claims another type', async () => {
		const input = await imageFixture(800, 600, 'jpeg');
		const image = await readAvatarImage(new File([input], 'avatar.png', { type: 'image/png' }));

		const metadata = await sharp(image.bytes).metadata();

		expect(metadata.format).toBe('webp');
		expect(metadata.width).toBe(512);
		expect(metadata.height).toBe(512);
	});

	it('does not enlarge an image smaller than the target', async () => {
		const input = await imageFixture(100, 80, 'png');
		const image = await readAvatarImage(new File([input], 'small.png'));

		const metadata = await sharp(image.bytes).metadata();

		expect(metadata.width).toBe(100);
		expect(metadata.height).toBe(80);
	});

	it('refuses bytes that are not a PNG or JPEG', async () => {
		const notAnImage = new File(['just some text'], 'avatar.png', { type: 'image/png' });

		await expect(readAvatarImage(notAnImage)).rejects.toMatchObject({
			code: 'INVALID_FILE_TYPE'
		});
	});

	it('refuses a file with a valid signature but a broken image body', async () => {
		const broken = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0]);

		await expect(readAvatarImage(new File([broken], 'broken.png'))).rejects.toMatchObject({
			code: 'INVALID_FILE_TYPE'
		});
	});

	it('refuses an empty file', async () => {
		await expect(readAvatarImage(new File([], 'empty.png'))).rejects.toMatchObject({
			code: 'VALIDATION_ERROR'
		});
	});

	it('refuses a file over 2 MB before reading it', async () => {
		const tooLarge = new File([new Uint8Array(MAX_AVATAR_BYTES + 1)], 'big.png');

		await expect(readAvatarImage(tooLarge)).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' });
	});
});

// A minimal DOCX: a zip with [Content_Types].xml and word/document.xml, which
// is what file-type inspects to tell a DOCX from a plain zip.
const DOCX_FIXTURE = Buffer.from(
	'UEsDBBQAAAAIABKpYl0Fs8M3mQAAAMsAAAARAAAAd29yZC9kb2N1bWVudC54bWxFzsEOwiAQBNBfIXu3VA/GNKUeTPwC9Y6ALQnsEhZt+/eGevDy5jKZTH9eYhAfl9kTKtg3LQiHhqzHUcH9dt2dQHDRaHUgdApWx3Ae+rmzZN7RYRFLDMjdrGAqJXVSsplc1NxQcrjE8KIcdeGG8ihnyjZlMo7Z4xiDPLTtUUbtEerkk+xaM1VypQyXRy9rVvNm2vx15f/H8AVQSwMEFAAAAAgAEqliXQLEp+zZAAAASwEAABMAAABbQ29udGVudF9UeXBlc10ueG1sfZC7TsQwEEV/xXKLEgcKhFCcLXiUQLF8wMieZK21Zyx7Nnj/HoVFW1BQ37lnju64aymqFUsNTFbf9oNWSI59oMXqz/1r96BVFSAPkQmtPmPVu2ncnzNW1VKkavVBJD8aU90BE9SeM1JLceaSQGrPZTEZ3BEWNHfDcG8ckyBJJxtDT+MzznCKol6aIF08WopaPV3utldWQ84xOJDAZLbUTOP7iqUEj+oDirxBQqvNFxdvPLtTQpL+f8xK/o9rx/McHF77Gy0XdlhroCXF/pokCHTz62F+xpi+AVBLAQIUABQAAAAIABKpYl0Fs8M3mQAAAMsAAAARAAAAAAAAAAAAAAAAAAAAAAB3b3JkL2RvY3VtZW50LnhtbFBLAQIUABQAAAAIABKpYl0CxKfs2QAAAEsBAAATAAAAAAAAAAAAAAAAAMgAAABbQ29udGVudF9UeXBlc10ueG1sUEsFBgAAAAACAAIAgAAAANIBAAAAAA==',
	'base64'
);

describe('readCvFile', () => {
	const PDF_BYTES = new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');

	it('accepts a PDF and keeps its name', async () => {
		const upload = await readCvFile(new File([PDF_BYTES], 'resume.pdf'));

		expect(upload.mimeType).toBe('application/pdf');
		expect(upload.extension).toBe('pdf');
		expect(upload.fileName).toBe('resume.pdf');
		expect(upload.bytes).toEqual(PDF_BYTES);
	});

	it('accepts a DOCX from its zip structure', async () => {
		const upload = await readCvFile(new File([DOCX_FIXTURE], 'resume.docx'));

		expect(upload.mimeType).toBe(
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
		);
		expect(upload.extension).toBe('docx');
	});

	it('refuses a file that is neither PDF nor DOCX', async () => {
		const text = new File(['just some text'], 'resume.docx', { type: 'application/pdf' });

		await expect(readCvFile(text)).rejects.toMatchObject({ code: 'INVALID_FILE_TYPE' });
	});

	it('refuses an empty file', async () => {
		await expect(readCvFile(new File([], 'empty.pdf'))).rejects.toMatchObject({
			code: 'VALIDATION_ERROR'
		});
	});

	it('refuses a file over 5 MB before reading it', async () => {
		const tooLarge = new File([new Uint8Array(MAX_CV_BYTES + 1)], 'big.pdf');

		await expect(readCvFile(tooLarge)).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' });
	});

	it('generates a name when the client sends none', async () => {
		const upload = await readCvFile(new File([PDF_BYTES], ''));

		expect(upload.fileName).toBe('cv.pdf');
	});

	it('strips a client path and control characters from the name', async () => {
		const upload = await readCvFile(new File([PDF_BYTES], 'C:\\Users\\me\\res\u0000ume.pdf'));

		expect(upload.fileName).toBe('resume.pdf');
	});
});
