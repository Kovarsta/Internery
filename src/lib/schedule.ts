/**
 * Structured working time, shared by the API, the forms and the card text.
 *
 * A job has one recurring weekly pattern: the days it runs and a start and end
 * clock time. The human-readable schedule on the card is always derived from
 * those values, never stored next to them, so the filter and the card cannot
 * disagree.
 */

/** Days in display order, Monday first. */
export const DAY_OF_WEEK_VALUES = [
	'MONDAY',
	'TUESDAY',
	'WEDNESDAY',
	'THURSDAY',
	'FRIDAY',
	'SATURDAY',
	'SUNDAY'
] as const;

export type DayOfWeek = (typeof DAY_OF_WEEK_VALUES)[number];

export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
	MONDAY: 'Monday',
	TUESDAY: 'Tuesday',
	WEDNESDAY: 'Wednesday',
	THURSDAY: 'Thursday',
	FRIDAY: 'Friday',
	SATURDAY: 'Saturday',
	SUNDAY: 'Sunday'
};

const SHORT_DAY_LABELS: Record<DayOfWeek, string> = {
	MONDAY: 'Mon',
	TUESDAY: 'Tue',
	WEDNESDAY: 'Wed',
	THURSDAY: 'Thu',
	FRIDAY: 'Fri',
	SATURDAY: 'Sat',
	SUNDAY: 'Sun'
};

/** `HH:MM`, the form the API and the forms use. */
export const CLOCK_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Coarse blocks used by the time-of-day filter and the form labels. */
export const TIME_OF_DAY_VALUES = ['MORNING', 'AFTERNOON', 'EVENING'] as const;

export type TimeOfDay = (typeof TIME_OF_DAY_VALUES)[number];

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
	MORNING: 'Morning',
	AFTERNOON: 'Afternoon',
	EVENING: 'Evening'
};

/**
 * Half-open local-time ranges: `from` is inclusive, `to` exclusive.
 *
 * A job matches a block when its shift overlaps it, so the check is
 * `startTime < to && endTime > from`. A 17:00-20:00 shift therefore matches
 * both Afternoon and Evening.
 */
export const TIME_OF_DAY_RANGES: Record<TimeOfDay, { from: string; to: string }> = {
	MORNING: { from: '05:00', to: '12:00' },
	AFTERNOON: { from: '12:00', to: '18:00' },
	EVENING: { from: '18:00', to: '22:00' }
};

/** True when a query or form value is a known day. */
export function isDayOfWeek(value: string): value is DayOfWeek {
	return DAY_OF_WEEK_VALUES.some((day) => day === value);
}

/** True when a query or form value is a known time-of-day block. */
export function isTimeOfDay(value: string): value is TimeOfDay {
	return TIME_OF_DAY_VALUES.some((slot) => slot === value);
}

/** Monday to Friday, reused by the day filters. */
export const WEEKDAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

/** Saturday and Sunday, reused by the day filters. */
export const WEEKEND_DAYS: DayOfWeek[] = ['SATURDAY', 'SUNDAY'];

type NamedDaySet = {
	/** The exact days this label describes. */
	days: readonly DayOfWeek[];
	label: string;
};

/** Day sets that read better as one phrase than as a list of short names. */
const NAMED_DAY_SETS: NamedDaySet[] = [
	{ days: DAY_OF_WEEK_VALUES, label: 'Every day' },
	{ days: WEEKDAYS, label: 'Weekdays' },
	{ days: WEEKEND_DAYS, label: 'Weekends' }
];

/** Sorts day values into Monday-first order, dropping duplicates. */
export function sortDaysOfWeek(days: readonly DayOfWeek[]): DayOfWeek[] {
	return DAY_OF_WEEK_VALUES.filter((day) => days.includes(day));
}

/** Trims a database `HH:MM:SS` time to the `HH:MM` form the API uses. */
export function toClockTime(value: string): string {
	return value.slice(0, 5);
}

/**
 * Renders one weekly pattern for display, for example `Weekdays, 06:00-10:00`.
 *
 * Day sets that read better as a phrase become one, so the card stays short.
 */
export function formatSchedule(
	daysOfWeek: readonly DayOfWeek[],
	startTime: string,
	endTime: string
): string {
	const days = sortDaysOfWeek(daysOfWeek);
	const timeRange = `${toClockTime(startTime)}-${toClockTime(endTime)}`;

	return `${formatDays(days)}, ${timeRange}`;
}

/**
 * Picks the shortest accurate label for a set of days.
 *
 * Expects days already sorted and deduplicated, as `sortDaysOfWeek` returns.
 */
function formatDays(days: readonly DayOfWeek[]): string {
	const namedSet = NAMED_DAY_SETS.find((candidate) => isSameDaySet(days, candidate.days));

	if (namedSet !== undefined) {
		return namedSet.label;
	}

	return days.map((day) => SHORT_DAY_LABELS[day]).join(', ');
}

/** True when both collections contain exactly the same days. */
function isSameDaySet(days: readonly DayOfWeek[], other: readonly DayOfWeek[]): boolean {
	if (days.length !== other.length) {
		return false;
	}

	return other.every((day) => days.includes(day));
}
