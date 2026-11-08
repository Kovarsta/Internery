import { describe, expect, it } from 'vitest';
import type { ResolvedPathname } from '$app/types';
import { readJobBrowseFilters, toJobSearchQuery, toJobsHref } from './job-search.ts';
import type { JobBrowseFilters } from './job-search.ts';

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
			locationId: undefined,
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
			['locationId', ''],
			['dayOfWeek', '']
		]);

		const filters = readJobBrowseFilters(params);

		expect(filters.query).toBeUndefined();
		expect(filters.locationId).toBeUndefined();
		expect(filters.daysOfWeek).toEqual([]);
	});
});

describe('toJobSearchQuery', () => {
	it('writes list filters as one comma-separated value', () => {
		const query = toJobSearchQuery({
			query: 'tutor',
			categoryId: '5f0f2f5e-3a0b-4b0e-9f5a-1c2d3e4f5a6b',
			locationId: '80000000-0000-4000-8000-000000000001',
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

describe('toJobsHref', () => {
	const jobsPath = '/jobs' as ResolvedPathname;
	const filters: JobBrowseFilters = {
		locationId: '80000000-0000-4000-8000-000000000001',
		daysOfWeek: ['SATURDAY'],
		timeOfDay: ['MORNING'],
		sort: 'newest',
		verifiedOnly: false
	};

	it('keeps every filter except the changed one', () => {
		expect(toJobsHref(jobsPath, filters, { timeOfDay: [] })).toBe(
			'/jobs?locationId=80000000-0000-4000-8000-000000000001&dayOfWeek=SATURDAY'
		);
	});

	it('returns the bare path when every filter is removed', () => {
		expect(
			toJobsHref(jobsPath, filters, {
				locationId: undefined,
				daysOfWeek: [],
				timeOfDay: []
			})
		).toBe('/jobs');
	});
});
