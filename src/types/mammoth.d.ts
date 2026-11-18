/**
 * Minimal typings for `mammoth`, which does not publish TypeScript declarations.
 *
 * Only the one call this project uses is declared. `mammoth` is a CommonJS
 * package, so it is imported through its default export.
 */
declare module 'mammoth' {
	export type MammothMessage = {
		type: string;
		message: string;
	};

	export type RawTextResult = {
		value: string;
		messages: MammothMessage[];
	};

	export function extractRawText(input: { buffer: Buffer }): Promise<RawTextResult>;

	const mammoth: {
		extractRawText: typeof extractRawText;
	};

	export default mammoth;
}
