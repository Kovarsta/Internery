import { describe, expect, it } from 'vitest';
import { readJobBrowseFilters, toJobSearchQuery } from './job-search.ts';

describe('readJobBrowseFilters', () => {
	it('reads repeated day and time parameters', () => {
		const params = new URLSearchParams([
			['q', 'barista'],
			['dayOfWeek', 'FRIDAY'],
			['dayOfWeek', 'MONDAY'],
			['timeOfDay', 'EVENING'],
			['timeOfDay', 'MORNING']
		]);

		expect(readJobBrowseFilters(params)).toEqual({
			query: 'barista',
			categoryId: undefined,
			location: undefined,
			daysOfWeek: ['MONDAY', 'FRIDAY'],
			timeOfDay: ['MORNING', 'EVENING'],
			sort: 'newest',
			verifiedOnly: false
		});
	});

	it('accepts one comma-separated value and drops unknown entries', () => {
		const params = new URLSearchParams([
			['dayOfWeek', 'MONDAY,FRIDAY,FRIDAY,HOLIDAY'],
			['timeOfDay', 'NIGHT,EVENING']
		]);

		const filters = readJobBrowseFilters(params);

		expect(filters.daysOfWeek).toEqual(['MONDAY', 'FRIDAY']);
		expect(filters.timeOfDay).toEqual(['EVENING']);
	});

	it('treats blank values as absent', () => {
		const params = new URLSearchParams([
			['q', '  '],
			['location', ''],
			['dayOfWeek', '']
		]);

		const filters = readJobBrowseFilters(params);

		expect(filters.query).toBeUndefined();
		expect(filters.location).toBeUndefined();
		expect(filters.daysOfWeek).toEqual([]);
	});
});

describe('toJobSearchQuery', () => {
	it('writes list filters as one comma-separated value', () => {
		const query = toJobSearchQuery({
			query: 'tutor',
			categoryId: '5f0f2f5e-3a0b-4b0e-9f5a-1c2d3e4f5a6b',
			location: 'Hanoi',
			daysOfWeek: ['MONDAY', 'WEDNESDAY'],
			timeOfDay: ['EVENING'],
			sort: 'salary_desc',
			verifiedOnly: true
		});

		expect(query.get('q')).toBe('tutor');
		expect(query.get('dayOfWeek')).toBe('MONDAY,WEDNESDAY');
		expect(query.get('timeOfDay')).toBe('EVENING');
		expect(query.get('sort')).toBe('salary_desc');
		expect(query.get('verifiedOnly')).toBe('true');
	});

	it('omits empty filters', () => {
		const query = toJobSearchQuery({
			daysOfWeek: [],
			timeOfDay: [],
			sort: 'newest',
			verifiedOnly: false
		});

		expect(query.toString()).toBe('');
	});
});
