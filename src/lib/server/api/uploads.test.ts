import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { readAvatarImage } from './uploads.ts';

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
		const tooLarge = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png');

		await expect(readAvatarImage(tooLarge)).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' });
	});
});
