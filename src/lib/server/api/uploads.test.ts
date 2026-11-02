import { describe, expect, it } from 'vitest';
import { readAvatarImage } from './uploads.ts';

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);

describe('readAvatarImage', () => {
	it('detects a PNG from its signature', async () => {
		const image = await readAvatarImage(new File([PNG_BYTES], 'avatar.png'));

		expect(image.contentType).toBe('image/png');
		expect(image.extension).toBe('png');
		expect(image.bytes).toEqual(PNG_BYTES);
	});

	it('detects a JPEG even when the client claims another type', async () => {
		const image = await readAvatarImage(
			new File([JPEG_BYTES], 'avatar.png', { type: 'image/png' })
		);

		expect(image.contentType).toBe('image/jpeg');
		expect(image.extension).toBe('jpg');
	});

	it('refuses bytes that are not a PNG or JPEG', async () => {
		const notAnImage = new File(['just some text'], 'avatar.png', { type: 'image/png' });

		await expect(readAvatarImage(notAnImage)).rejects.toMatchObject({
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
