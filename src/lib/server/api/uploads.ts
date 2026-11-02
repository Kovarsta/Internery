import sharp from 'sharp';
import { ApiError } from './errors.ts';

/** Largest avatar the API accepts. Matches the contract and the storage decision. */
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

// A small compressed file can decode to an enormous raster, so the decoder is
// capped at 16 MP. That covers a 12 MP phone photo with room to spare.
const MAX_INPUT_PIXELS = 16_000_000;

// Every stored avatar is square WebP. Re-encoding also drops EXIF, which is
// where phone photos keep GPS coordinates.
const AVATAR_SIZE = 512;
const WEBP_QUALITY = 80;

/** Formats the API accepts. The check runs on the decoded file, not its name. */
const ACCEPTED_FORMATS = ['png', 'jpeg'];

/** A validated and normalised avatar upload, ready to store. */
export type AvatarImage = {
	bytes: Uint8Array;
	contentType: 'image/webp';
	extension: 'webp';
};

/**
 * Parses a multipart form body.
 *
 * Malformed input becomes `422` rather than an internal error, the same way
 * `parseJson` handles broken JSON.
 */
export async function parseFormData(request: Request): Promise<FormData> {
	try {
		return await request.formData();
	} catch {
		throw new ApiError('VALIDATION_ERROR', 'Request body must be multipart form data.');
	}
}

/**
 * Validates an uploaded avatar and normalises it for storage.
 *
 * The size is checked before the file is read. The format comes from sharp's
 * own detection of the bytes, so a renamed file or a false `file.type` cannot
 * get through. The accepted image is rotated by its EXIF orientation, cropped
 * towards a square (never enlarged) and re-encoded as WebP, which makes the
 * stored object ours.
 *
 * Throws `FILE_TOO_LARGE` (`413`), `INVALID_FILE_TYPE` (`415`) for anything
 * that is not a decodable PNG or JPEG, or `VALIDATION_ERROR` (`422`) for an
 * empty file.
 */
export async function readAvatarImage(file: File): Promise<AvatarImage> {
	if (file.size === 0) {
		throw validationError('The image is empty.');
	}

	if (file.size > MAX_AVATAR_BYTES) {
		throw new ApiError('FILE_TOO_LARGE');
	}

	const bytes = new Uint8Array(await file.arrayBuffer());
	const image = sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS });

	try {
		const metadata = await image.metadata();

		if (!ACCEPTED_FORMATS.includes(metadata.format ?? '')) {
			throw new ApiError('INVALID_FILE_TYPE');
		}

		const processed = await image
			.rotate()
			.resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', withoutEnlargement: true })
			.webp({ quality: WEBP_QUALITY })
			.toBuffer();

		return { bytes: new Uint8Array(processed), contentType: 'image/webp', extension: 'webp' };
	} catch (error) {
		if (error instanceof ApiError) {
			throw error;
		}

		// A file can look like an image and still fail to decode.
		throw new ApiError('INVALID_FILE_TYPE');
	}
}

/** Builds a `422` that points at the upload field. */
function validationError(message: string): ApiError {
	return new ApiError('VALIDATION_ERROR', 'Request validation failed.', [
		{ field: 'file', message }
	]);
}
