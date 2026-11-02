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
// The first bytes of each accepted format. A browser-supplied MIME type is a
// claim; these bytes are the actual file, so the check cannot be fooled by
// renaming. https://en.wikipedia.org/wiki/List_of_file_signatures
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

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
 * The size is checked before the file is read. The type comes from the file
 * signature, not from `file.type`, which the client controls. The accepted
 * bytes are then rotated by their EXIF orientation, cropped towards a square
 * (never enlarged) and re-encoded as WebP, so the stored object is always ours.
 *
 * Throws `FILE_TOO_LARGE` (`413`), `INVALID_FILE_TYPE` (`415`) for a file that
 * is not a decodable PNG or JPEG, or `VALIDATION_ERROR` (`422`) for an empty
 * file.
 */
export async function readAvatarImage(file: File): Promise<AvatarImage> {
	if (file.size === 0) {
		throw validationError('The image is empty.');
	}

	if (file.size > MAX_AVATAR_BYTES) {
		throw new ApiError('FILE_TOO_LARGE');
	}

	const bytes = new Uint8Array(await file.arrayBuffer());

	if (!startsWith(bytes, PNG_SIGNATURE) && !startsWith(bytes, JPEG_SIGNATURE)) {
		throw new ApiError('INVALID_FILE_TYPE');
	}

	try {
		const processed = await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS })
			.rotate()
			.resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', withoutEnlargement: true })
			.webp({ quality: WEBP_QUALITY })
			.toBuffer();

		return { bytes: new Uint8Array(processed), contentType: 'image/webp', extension: 'webp' };
	} catch {
		// A file can carry a valid signature and still fail to decode.
		throw new ApiError('INVALID_FILE_TYPE');
	}
}

/** Checks whether the bytes begin with every byte of the signature. */
function startsWith(bytes: Uint8Array, signature: number[]): boolean {
	if (bytes.length < signature.length) {
		return false;
	}

	return signature.every((byte, index) => bytes[index] === byte);
}

/** Builds a `422` that points at the upload field. */
function validationError(message: string): ApiError {
	return new ApiError('VALIDATION_ERROR', 'Request validation failed.', [
		{ field: 'file', message }
	]);
}
