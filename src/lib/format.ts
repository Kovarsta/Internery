import type { SalaryType } from '#lib/api/types.ts';

const vnd = new Intl.NumberFormat('vi-VN');

// Date-only strings are parsed at UTC midnight; formatting in UTC avoids a day
// shift for readers west of Greenwich.
const dayMonth = new Intl.DateTimeFormat('en-GB', {
	day: '2-digit',
	month: 'short',
	timeZone: 'UTC'
});

const dayMonthYear = new Intl.DateTimeFormat('en-GB', {
	day: '2-digit',
	month: 'short',
	year: 'numeric',
	timeZone: 'UTC'
});

/** Formats an integer VND amount with its pay period. */
export function formatSalary(amount: number, type: SalaryType): string {
	const suffix = type === 'HOURLY' ? '/hour' : type === 'DAILY' ? '/day' : '';

	return `${vnd.format(amount)}₫${suffix}`;
}

/** Formats a `YYYY-MM-DD` date for display. */
export function formatDate(value: string): string {
	return dayMonth.format(new Date(`${value}T00:00:00Z`));
}

/** Formats an ISO timestamp as a calendar date. */
export function formatTimestamp(value: string): string {
	return dayMonthYear.format(new Date(value));
}

/** Formats a job's date range, for example `01 Nov – 30 Nov`. */
export function formatDateRange(startDate: string, endDate: string): string {
	return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

/** Describes how many places are still open. */
export function formatPositionsRemaining(count: number): string {
	if (count <= 0) {
		return 'No positions left';
	}

	return count === 1 ? '1 position left' : `${count} positions left`;
}
