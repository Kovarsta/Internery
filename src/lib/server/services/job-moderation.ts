import { SCAM_TERMS } from './scam-terms.ts';

/**
 * Returns the scam terms present in the given text.
 *
 * Matching is case-insensitive and substring-based. A phrase such as
 * "hoàn toàn miễn phí" is not flagged, but anything containing "đặt cọc" is.
 */
export function findScamTerms(text: string): string[] {
	const haystack = text.toLowerCase();

	return SCAM_TERMS.filter((term) => haystack.includes(term));
}
