/**
 * Terms that commonly appear in scam job posts on the Vietnamese market.
 *
 * Product owns this list. Every entry must be lowercase and free of leading or
 * trailing spaces, because matching lowercases the posting once and then looks
 * for these strings as-is.
 *
 * A hit only flags the job for the admin moderation queue; it never blocks or
 * hides the posting (AC-43.1), so a false positive costs a review rather than a
 * rejected employer.
 */
export const SCAM_TERMS: readonly string[] = [
	'đặt cọc',
	'cọc trước',
	'nộp phí',
	'thu phí',
	'chuyển khoản trước',
	'việc nhẹ lương cao',
	'telegram'
];
