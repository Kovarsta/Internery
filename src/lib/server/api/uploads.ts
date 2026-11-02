import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import { ApiError } from './errors.ts';

/**
 * One megabyte in bytes.
 *
 * File sizes are binary, so a "2 MB" limit is 2 × 1024 × 1024 = 2,097,152 bytes.
 */
const MEGABYTE = 1024 * 1024;

/**
 * One megapixel in pixels.
 *
 * Image dimensions are quoted in decimal by camera makers, so 16 MP is
 * 16 × 1000 × 1000 = 16,000,000 pixels, not 16 × 1024 × 1024.
 */
const MEGAPIXEL = 1_000_000;

/** Largest avatar the API accepts. Matches the contract and the storage decision. */
export const MAX_AVATAR_BYTES = 2 * MEGABYTE;

/** Largest CV the API accepts. */
export const MAX_CV_BYTES = 5 * MEGABYTE;

// A small compressed file can decode to an enormous raster, so the decoder is
// capped at 16 MP (roughly 4000 × 4000). A 12 MP phone photo fits easily.
const MAX_INPUT_PIXELS = 16 * MEGAPIXEL;

// Every stored avatar is square WebP. Re-encoding also drops EXIF, which is
// where phone photos keep GPS coordinates.
const AVATAR_EDGE_PIXELS = 512;
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
			.resize(AVATAR_EDGE_PIXELS, AVATAR_EDGE_PIXELS, {
				fit: 'cover',
				withoutEnlargement: true
			})
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

const PDF_MIME = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** A validated CV upload, ready to store. */
export type CvUpload = {
	bytes: Uint8Array;
	fileName: string;
	mimeType: typeof PDF_MIME | typeof DOCX_MIME;
	extension: 'pdf' | 'docx';
};

/**
 * Validates an uploaded CV and returns its bytes and detected format.
 *
 * The size is checked before the file is read. The format comes from
 * `file-type`, which inspects the bytes: a PDF signature, or the ZIP structure
 * of a DOCX. A plain ZIP renamed to `.docx` is refused.
 *
 * Throws `FILE_TOO_LARGE` (`413`), `INVALID_FILE_TYPE` (`415`) for anything
 * that is not a PDF or DOCX, or `VALIDATION_ERROR` (`422`) for an empty file.
 */
export async function readCvFile(file: File): Promise<CvUpload> {
	if (file.size === 0) {
		throw validationError('The file is empty.');
	}

	if (file.size > MAX_CV_BYTES) {
		throw new ApiError('FILE_TOO_LARGE');
	}

	const bytes = new Uint8Array(await file.arrayBuffer());
	const detected = await fileTypeFromBuffer(bytes).catch(() => null);

	if (detected?.ext === 'pdf') {
		return {
			bytes,
			fileName: safeFileName(file.name, 'pdf'),
			mimeType: PDF_MIME,
			extension: 'pdf'
		};
	}

	if (detected?.ext === 'docx') {
		return {
			bytes,
			fileName: safeFileName(file.name, 'docx'),
			mimeType: DOCX_MIME,
			extension: 'docx'
		};
	}

	throw new ApiError('INVALID_FILE_TYPE');
}

/**
 * Keeps a display name that is safe to store and send back in a header.
 *
 * The browser can send a path in `file.name`, and control characters do not
 * belong in a database column or an HTTP header. An empty name becomes
 * `cv.<extension>` so the download always has something to call itself.
 */
function safeFileName(name: string, extension: string): string {
	const base = name.split(/[\\/]/).pop() ?? '';
	const cleaned = [...base]
		.filter((character) => character >= ' ' && character !== '\u007f')
		.join('')
		.trim();

	if (cleaned === '') {
		return `cv.${extension}`;
	}

	return [...cleaned].slice(0, 255).join('');
}

/** Builds a `422` that points at the upload field. */
function validationError(message: string): ApiError {
	return new ApiError('VALIDATION_ERROR', 'Request validation failed.', [
		{ field: 'file', message }
	]);
}
