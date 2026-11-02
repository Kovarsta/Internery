import type { StoredObject } from '#lib/server/storage/client.ts';

/**
 * Builds the response for a private file download.
 *
 * The file is never cached: a CV is personal and its key can change.
 */
export function fileDownload(object: StoredObject, fileName: string): Response {
	const headers = new Headers({
		'Content-Type': object.contentType ?? 'application/octet-stream',
		'Content-Disposition': contentDisposition(fileName),
		'Cache-Control': 'private, no-store'
	});

	if (object.contentLength !== null) {
		headers.set('Content-Length', String(object.contentLength));
	}

	return new Response(object.body, { headers });
}

/**
 * Builds an attachment header that survives a non-ASCII file name.
 *
 * The quoted `filename` is the ASCII fallback older clients read, and
 * `filename*` carries the real name percent-encoded. Anything outside
 * printable ASCII, plus quotes and backslashes, becomes `_`, so the header
 * stays valid and cannot break out of its quotes.
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Disposition
 */
export function contentDisposition(fileName: string): string {
	// The quoted form must be plain ASCII; the real name travels in filename*.
	const fallback = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
	const encoded = encodeURIComponent(fileName).replace(/'/g, '%27');

	return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
