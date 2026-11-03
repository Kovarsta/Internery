import { toast } from 'svelte-french-toast';

const INK = '#17211b';
const PAPER = '#f5f6f2';
const CHALK = '#1e5b43';
const WARNING = '#c44536';

/**
 * Toast chrome in the app palette.
 *
 * The toast is the one dark surface in the interface, so it reads as a
 * notification rather than another card. The left rule carries the outcome:
 * chalk for success, warning red for failure. Keep these values in sync with the
 * `@theme` tokens in `src/routes/(app)/layout.css`.
 */
function toastStyle(accent: string): string {
	return [
		`background: ${INK}`,
		`color: ${PAPER}`,
		`border-left: 4px solid ${accent}`,
		'border-radius: 0.375rem',
		'box-shadow: 0 14px 34px rgba(23, 33, 27, 0.24)',
		'font-family: inherit',
		'font-size: 0.875rem',
		'line-height: 1.45',
		'padding: 0.7rem 0.9rem',
		'max-width: 22rem'
	].join('; ');
}

/** Shows a success toast styled for the app. */
export function showSuccess(message: string): void {
	toast.success(message, {
		style: toastStyle(CHALK),
		iconTheme: { primary: PAPER, secondary: CHALK }
	});
}

/** Shows an error toast styled for the app. */
export function showError(message: string): void {
	toast.error(message, {
		style: toastStyle(WARNING),
		iconTheme: { primary: PAPER, secondary: WARNING }
	});
}
