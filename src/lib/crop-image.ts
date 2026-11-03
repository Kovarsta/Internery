/**
 * Browser-only image helper for the avatar cropper.
 *
 * The cropper reports the selected rectangle in the source image's natural
 * pixels. This module copies that rectangle onto a square canvas and encodes it
 * as JPEG, so the uploaded file is small and already square.
 */

/** Side of the square avatar the cropper produces, in pixels. */
export const AVATAR_OUTPUT_SIZE = 512;

/**
 * JPEG quality for the cropped avatar, from 0 (smallest file) to 1 (best
 * quality). 0.92 keeps a 512 × 512 face sharp while the upload stays around
 * 100 KB; the server re-encodes the picture to WebP afterwards anyway.
 */
const JPEG_QUALITY = 0.92;

/** JPEG cannot store transparency, so these areas are filled with this colour. */
const JPEG_BACKGROUND = '#ffffff';

/** The selected part of an image, in the image's natural pixel coordinates. */
export type CropArea = {
	x: number;
	y: number;
	width: number;
	height: number;
};

/**
 * Copies `area` of the source image onto a square canvas and returns a JPEG.
 *
 * The canvas is filled white before the image is drawn. A JPEG cannot store
 * transparency, so without the fill the transparent parts of a PNG would turn
 * black.
 *
 * Throws when the browser cannot load the image or encode the canvas.
 */
export async function cropImageToSquare(
	sourceUrl: string,
	area: CropArea,
	size: number
): Promise<Blob> {
	const image = await loadImage(sourceUrl);

	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;

	const context = canvas.getContext('2d');

	if (!context) {
		throw new Error('The browser could not prepare the image.');
	}

	context.fillStyle = JPEG_BACKGROUND;
	context.fillRect(0, 0, size, size);

	// Higher smoothing keeps the downscaled avatar from looking jagged.
	context.imageSmoothingEnabled = true;
	context.imageSmoothingQuality = 'high';

	// Take the selected rectangle from the source image and draw it over the
	// full canvas, which scales it to the output size.
	context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, size, size);

	return encodeJpeg(canvas);
}

/** Loads an image URL into an element the canvas can draw. */
function loadImage(sourceUrl: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();

		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error('The image could not be read.'));
		image.src = sourceUrl;
	});
}

/**
 * Encodes a canvas as a JPEG.
 *
 * `canvas.toBlob` is callback-based, so it is wrapped in a promise to keep the
 * caller readable with `await`.
 */
function encodeJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error('The image could not be encoded.'));
				}
			},
			'image/jpeg',
			JPEG_QUALITY
		);
	});
}
