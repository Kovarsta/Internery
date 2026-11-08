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

/** Formats a job's date range, for example `01 Nov - 30 Nov`. */
export function formatDateRange(startDate: string, endDate: string): string {
	return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * Formats a timestamp as elapsed time, for example `Just now` or `2 hours ago`.
 *
 * `now` is injectable so the output can be tested without freezing the clock.
 * Future timestamps read as `Just now`, because a posting cannot be newer than
 * the moment the page is rendered.
 */
export function formatRelativeTime(value: string | Date, now: number = Date.now()): string {
	const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);

	if (!Number.isFinite(timestamp)) {
		return 'Just now';
	}

	const elapsed = Math.max(now - timestamp, 0);

	if (elapsed < MINUTE) {
		return 'Just now';
	}

	if (elapsed < HOUR) {
		return elapsedLabel(Math.floor(elapsed / MINUTE), 'minute');
	}

	if (elapsed < DAY) {
		return elapsedLabel(Math.floor(elapsed / HOUR), 'hour');
	}

	if (elapsed < WEEK) {
		return elapsedLabel(Math.floor(elapsed / DAY), 'day');
	}

	if (elapsed < MONTH) {
		return elapsedLabel(Math.floor(elapsed / WEEK), 'week');
	}

	if (elapsed < YEAR) {
		return elapsedLabel(Math.floor(elapsed / MONTH), 'month');
	}

	return elapsedLabel(Math.floor(elapsed / YEAR), 'year');
}

function elapsedLabel(count: number, unit: string): string {
	return `${count} ${unit}${count === 1 ? '' : 's'} ago`;
}

/** Describes how many places are still open. */
export function formatPositionsRemaining(count: number): string {
	if (count <= 0) {
		return 'No positions left';
	}

	return count === 1 ? '1 position left' : `${count} positions left`;
}

/** Formats a byte count for an upload, for example `412 KB` or `1.8 MB`. */
export function formatFileSize(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`;
	}

	if (bytes < 1024 * 1024) {
		return `${Math.round(bytes / 1024)} KB`;
	}

	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
