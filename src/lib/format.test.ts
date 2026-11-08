import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from './format.ts';

const now = Date.parse('2026-11-09T12:00:00.000Z');

function ago(milliseconds: number): string {
	return new Date(now - milliseconds).toISOString();
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatRelativeTime', () => {
	it('says Just now under a minute or in the future', () => {
		expect(formatRelativeTime(ago(30_000), now)).toBe('Just now');
		expect(formatRelativeTime(new Date(now + HOUR).toISOString(), now)).toBe('Just now');
	});

	it('uses singular and plural minutes and hours', () => {
		expect(formatRelativeTime(ago(MINUTE), now)).toBe('1 minute ago');
		expect(formatRelativeTime(ago(5 * MINUTE), now)).toBe('5 minutes ago');
		expect(formatRelativeTime(ago(HOUR), now)).toBe('1 hour ago');
		expect(formatRelativeTime(ago(2 * HOUR), now)).toBe('2 hours ago');
	});

	it('moves to days, weeks, months and years', () => {
		expect(formatRelativeTime(ago(DAY), now)).toBe('1 day ago');
		expect(formatRelativeTime(ago(2 * DAY), now)).toBe('2 days ago');
		expect(formatRelativeTime(ago(7 * DAY), now)).toBe('1 week ago');
		expect(formatRelativeTime(ago(14 * DAY), now)).toBe('2 weeks ago');
		expect(formatRelativeTime(ago(30 * DAY), now)).toBe('1 month ago');
		expect(formatRelativeTime(ago(60 * DAY), now)).toBe('2 months ago');
		expect(formatRelativeTime(ago(365 * DAY), now)).toBe('1 year ago');
		expect(formatRelativeTime(ago(730 * DAY), now)).toBe('2 years ago');
	});

	it('falls back to Just now for an invalid timestamp', () => {
		expect(formatRelativeTime('not a date', now)).toBe('Just now');
	});
});
