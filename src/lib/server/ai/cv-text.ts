/**
 * Turns an uploaded CV into the text the AI provider reads.
 *
 * PDF and DOCX need different tools:
 *
 * - PDF: [`@firecrawl/pdf-inspector`](https://github.com/firecrawl/pdf-inspector)
 *   runs locally and classifies the document before extracting text. A scanned
 *   or image-only PDF has no text layer, so it is rejected as unreadable
 *   instead of being sent to OCR or to the model.
 * - DOCX: [`mammoth`](https://github.com/mwilliamson/mammoth.js) reads the
 *   document XML and returns its raw text.
 *
 * This module also owns the text normalisation used for the CV hash and for
 * quote verification, so the hash and the check always see the same string.
 */
import { classifyPdfAsync, extractPagesMarkdownAsync } from '@firecrawl/pdf-inspector';
import mammoth from 'mammoth';
import { createHash } from 'node:crypto';

/** A stored CV file as the extraction needs it. */
export type CvFile = {
	/** The file's raw bytes. One array element is one byte. */
	bytes: Uint8Array;
	/** File name, used to detect the format when the media type is missing. */
	fileName: string;
	/** Stored media type, or null when the upload did not record one. */
	mimeType: string | null;
};

/** Why a CV could not be turned into text. */
export type CvUnreadableReason = 'unsupported' | 'scanned' | 'empty';

/**
 * A CV that has no usable text.
 *
 * The service layer maps this to the public `422 CV_UNREADABLE` code, so the
 * reason stays internal and only the stable API code reaches the client.
 */
export class CvUnreadableError extends Error {
	readonly reason: CvUnreadableReason;

	constructor(reason: CvUnreadableReason, message: string) {
		super(message);
		this.name = 'CvUnreadableError';
		this.reason = reason;
	}
}

/** Longest CV text sent to the provider. A normal one-page CV is far shorter. */
export const MAX_CV_TEXT_CHARACTERS = 20_000;

/** Shortest text that can reasonably be called a CV. */
const MIN_CV_TEXT_CHARACTERS = 40;

/** Media type stored for a PDF upload. */
const PDF_MIME = 'application/pdf';
/** Media type stored for a DOCX upload. */
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Extracts the text of a CV.
 *
 * Throws `CvUnreadableError` when the format is unsupported, the PDF has no
 * text layer, or too little text was found to compare against a job advert.
 */
export async function extractCvText(file: CvFile): Promise<string> {
	const format = detectFormat(file);

	if (format === 'pdf') {
		return extractPdfText(file.bytes);
	}

	if (format === 'docx') {
		return extractDocxText(file.bytes);
	}

	throw new CvUnreadableError('unsupported', 'The CV is not a PDF or DOCX file.');
}

/** Reads the format from the media type, then from the file extension. */
function detectFormat(file: CvFile): 'pdf' | 'docx' | null {
	const mimeType = file.mimeType?.toLowerCase() ?? '';

	if (mimeType === PDF_MIME) {
		return 'pdf';
	}

	if (mimeType === DOCX_MIME) {
		return 'docx';
	}

	const fileName = file.fileName.toLowerCase();

	if (fileName.endsWith('.pdf')) {
		return 'pdf';
	}

	if (fileName.endsWith('.docx')) {
		return 'docx';
	}

	return null;
}

/**
 * Extracts text from a PDF, rejecting scans and image-only files.
 *
 * `Mixed` documents still contain some text, so the extracted text decides:
 * if it is shorter than `MIN_CV_TEXT_CHARACTERS`, there is nothing useful to
 * compare and the result is unreadable.
 *
 * The classification and extraction calls are documented in the package
 * README: https://github.com/firecrawl/pdf-inspector#readme
 */
async function extractPdfText(bytes: Uint8Array): Promise<string> {
	const buffer = Buffer.from(bytes);

	let classification;

	try {
		classification = await classifyPdfAsync(buffer);
	} catch {
		throw new CvUnreadableError('unsupported', 'The PDF could not be opened.');
	}

	if (classification.pdfType === 'Scanned' || classification.pdfType === 'ImageBased') {
		throw new CvUnreadableError(
			'scanned',
			'The PDF has no text layer. It looks like a scan or an image.'
		);
	}

	let pages;

	try {
		pages = await extractPagesMarkdownAsync(buffer);
	} catch {
		throw new CvUnreadableError('unsupported', 'The PDF text could not be read.');
	}

	const text = pages.pages.map((page) => page.markdown).join('\n\n');

	return requireUsableText(text, 'The PDF has too little text to compare.');
}

/**
 * Extracts the raw text of a DOCX through `mammoth`.
 *
 * `extractRawText` ignores layout and returns the document text:
 * https://github.com/mwilliamson/mammoth.js#extracting-raw-text
 */
async function extractDocxText(bytes: Uint8Array): Promise<string> {
	let result;

	try {
		result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
	} catch {
		throw new CvUnreadableError('unsupported', 'The DOCX file could not be read.');
	}

	return requireUsableText(result.value, 'The DOCX file has too little text to compare.');
}

/** Rejects text that is present but too short to describe a person. */
function requireUsableText(text: string, message: string): string {
	const normalised = normaliseCvText(text);

	if (normalised.length < MIN_CV_TEXT_CHARACTERS) {
		throw new CvUnreadableError('empty', message);
	}

	return normalised;
}

/**
 * Normalises whitespace without changing words.
 *
 * The result is what gets hashed, cached and sent to the provider, so
 * extraction quirks such as trailing spaces do not create a new cache entry
 * for an unchanged CV.
 */
export function normaliseCvText(text: string): string {
	return text
		.replace(/\r\n?/g, '\n')
		.replaceAll('\u0000', '')
		.split('\n')
		.map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

/**
 * Produces the string used to check that a quote appears in the CV.
 *
 * The provider sees markdown from the PDF extractor, so a verbatim quote can
 * contain `#`, `*` or table pipes. Removing that punctuation on both sides
 * makes the check about the words, not the formatting.
 */
export function comparableCvText(text: string): string {
	return normaliseCvText(text)
		.replace(/[*_`#>|]/g, ' ')
		.replace(/^\s*[-+]\s+/gm, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();
}

/** Returns true when `quote` appears in `cvText` after normalisation. */
export function quoteAppearsInCv(quote: string, cvText: string): boolean {
	const normalisedQuote = comparableCvText(quote);

	if (normalisedQuote.length === 0) {
		return false;
	}

	return comparableCvText(cvText).includes(normalisedQuote);
}

/**
 * Hashes the normalised CV text with SHA-256.
 *
 * The hash of the redacted text, not of the file, keys the explanation cache.
 * Re-uploading the same CV therefore hits the cache, while any edit to the
 * text misses it.
 */
export function hashCvText(cvText: string): string {
	return createHash('sha256').update(normaliseCvText(cvText), 'utf8').digest('hex');
}

/** Trims CV text to the longest string the provider is allowed to receive. */
export function limitCvText(cvText: string): string {
	if (cvText.length <= MAX_CV_TEXT_CHARACTERS) {
		return cvText;
	}

	return cvText.slice(0, MAX_CV_TEXT_CHARACTERS);
}
