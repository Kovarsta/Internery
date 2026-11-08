import { describe, expect, it } from 'vitest';
import {
	DAY_OF_WEEK_VALUES,
	WEEKDAYS,
	WEEKEND_DAYS,
	formatSchedule,
	sortDaysOfWeek,
	toClockTime
} from './schedule.ts';

describe('sortDaysOfWeek', () => {
	it('uses Monday-first order regardless of the input order', () => {
		expect(sortDaysOfWeek(['FRIDAY', 'MONDAY', 'WEDNESDAY'])).toEqual([
			'MONDAY',
			'WEDNESDAY',
			'FRIDAY'
		]);
	});

	it('drops duplicates', () => {
		expect(sortDaysOfWeek(['FRIDAY', 'MONDAY', 'FRIDAY'])).toEqual(['MONDAY', 'FRIDAY']);
	});
});

describe('toClockTime', () => {
	it('trims database seconds', () => {
		expect(toClockTime('06:00:00')).toBe('06:00');
	});

	it('leaves an already trimmed time alone', () => {
		expect(toClockTime('06:00')).toBe('06:00');
	});
});

describe('formatSchedule', () => {
	it('names the common week patterns', () => {
		expect(formatSchedule(WEEKDAYS, '06:00:00', '10:00:00')).toBe('Weekdays, 06:00-10:00');
		expect(formatSchedule(WEEKEND_DAYS, '09:00:00', '18:00:00')).toBe('Weekends, 09:00-18:00');
		expect(formatSchedule([...DAY_OF_WEEK_VALUES], '08:00:00', '17:00:00')).toBe(
			'Every day, 08:00-17:00'
		);
	});

	it('lists any other day set by short name', () => {
		expect(formatSchedule(['FRIDAY', 'MONDAY', 'WEDNESDAY'], '18:00:00', '21:00:00')).toBe(
			'Mon, Wed, Fri, 18:00-21:00'
		);
	});

	it('sorts and deduplicates before formatting', () => {
		expect(formatSchedule(['SUNDAY', 'SATURDAY', 'SATURDAY'], '08:00:00', '16:00:00')).toBe(
			'Weekends, 08:00-16:00'
		);
	});
});
