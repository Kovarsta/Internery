/**
 * Removes personal details from CV text before it leaves the server.
 *
 * The AI provider receives the CV text, so the student's name, phone number
 * and email are replaced with placeholders first (AC-38.2). This is a privacy
 * filter, not anonymisation: it removes the details the system knows about. A
 * nickname or a personal address that the profile does not contain can still
 * remain in the text, so the consent notice must not promise anonymity.
 */

/** The parts of a student identity that must not reach the provider. */
export type CvIdentity = {
	fullName: string;
	email: string;
	phone: string | null;
};

const EMAIL_PLACEHOLDER = '[email]';
const PHONE_PLACEHOLDER = '[phone]';
const NAME_PLACEHOLDER = '[name]';

/**
 * A practical email pattern.
 *
 * This runs on CV text that already passed file validation, so it only has to
 * catch the addresses a person writes, not every address RFC 5322 allows.
 */
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/**
 * Vietnamese phone numbers: a leading `0` or `+84`, then 8 to 10 digits.
 *
 * Separators are allowed between digits because CVs write numbers as
 * `090 123 4567` and `(028) 3822 1234`.
 */
const PHONE_PATTERN = /[(]?(?:\+?84|0)(?:[\s.\-()]*\d){8,10}(?!\d)/g;

/**
 * Replaces the student's name, phone number and email with placeholders.
 *
 * Only the full name is matched as a whole. A first name used on its own in
 * the CV can survive, which is the limitation described above: matching every
 * name part would also remove ordinary words such as "An" or "Do" from the
 * text the model needs to read.
 */
export function redactCvText(text: string, identity: CvIdentity): string {
	let redacted = text.replace(EMAIL_PATTERN, EMAIL_PLACEHOLDER);

	redacted = redacted.replace(PHONE_PATTERN, PHONE_PLACEHOLDER);

	// The profile phone may use a format the pattern does not catch. Replacing
	// it literally costs nothing and covers that case.
	if (identity.phone) {
		redacted = redacted.replaceAll(identity.phone, PHONE_PLACEHOLDER);
	}

	redacted = redactFullName(redacted, identity.fullName);

	return redacted;
}

/**
 * Replaces every spelling of the full name, including extra spaces between
 * its parts and any letter case.
 *
 * The lookarounds use Unicode letter and number classes, so a Vietnamese name
 * with diacritics is still matched as a whole word. See MDN's regular-expression
 * reference, "Unicode character class escape":
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions
 */
function redactFullName(text: string, fullName: string): string {
	const nameParts = fullName
		.trim()
		.split(/\s+/)
		.filter((part) => part.length > 0);

	if (nameParts.length === 0) {
		return text;
	}

	// Join with `\s+` so a line break or a double space inside the name still
	// matches. Lookarounds keep a part of a longer word intact.
	const namePattern = nameParts.map(escapeRegExp).join('\\s+');
	const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${namePattern}(?![\\p{L}\\p{N}])`, 'giu');

	return text.replace(pattern, NAME_PLACEHOLDER);
}

/** Escapes the characters that mean something in a regular expression. */
function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
