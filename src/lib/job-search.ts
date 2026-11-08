/**
 * The `/jobs` filters: how they are read from the page URL and written to the
 * public search API.
 *
 * The page uses repeated parameters (`dayOfWeek=MONDAY&dayOfWeek=WEDNESDAY`)
 * because that is what a plain checkbox form submits. The API takes one
 * comma-separated value, so this module is the only place that translates
 * between the two.
 */

import {
	TIME_OF_DAY_VALUES,
	type DayOfWeek,
	isDayOfWeek,
	isTimeOfDay,
	type TimeOfDay,
	sortDaysOfWeek
} from '#lib/schedule.ts';
import type { ResolvedPathname } from '$app/types';

export type JobBrowseFilters = {
	/** Free-text keyword, absent when the search box is empty. */
	query?: string;
	categoryId?: string;
	/** Canonical location id, absent when no location is selected. */
	locationId?: string;
	/** Selected days, Monday-first; empty means no day filter. */
	daysOfWeek: DayOfWeek[];
	/** Selected time blocks; empty means no time filter. */
	timeOfDay: TimeOfDay[];
	sort: 'newest' | 'salary_desc';
	verifiedOnly: boolean;
};

/**
 * Reads the `/jobs` filters from a page URL.
 *
 * Accepts the repeated parameters a form submits
 * (`dayOfWeek=MONDAY&dayOfWeek=WEDNESDAY`) and the comma-separated form a
 * shared link may use (`dayOfWeek=MONDAY,WEDNESDAY`). Unknown, duplicate and
 * blank entries are dropped.
 *
 * @param params - The page's `URLSearchParams`.
 * @returns Every filter; list fields are empty arrays when unset.
 */
export function readJobBrowseFilters(params: URLSearchParams): JobBrowseFilters {
	return {
		query: readText(params.get('q')),
		categoryId: readText(params.get('categoryId')),
		locationId: readText(params.get('locationId')),
		daysOfWeek: readDaysOfWeek(params.getAll('dayOfWeek')),
		timeOfDay: readTimeOfDay(params.getAll('timeOfDay')),
		sort: params.get('sort') === 'salary_desc' ? 'salary_desc' : 'newest',
		verifiedOnly: params.get('verifiedOnly') === 'true'
	};
}

/**
 * Builds the query string for `GET /jobs`.
 *
 * Only active filters are written, so an empty result means “request the
 * unfiltered feed”. Lists become one comma-separated value, the shape the API
 * documents.
 *
 * @param filters - The filters read from the page URL.
 * @returns The API query string, without pagination.
 *
 * @example
 * const query = toJobSearchQuery({
 * 	daysOfWeek: ['MONDAY', 'WEDNESDAY'],
 * 	timeOfDay: [],
 * 	sort: 'newest',
 * 	verifiedOnly: false
 * });
 * // "dayOfWeek=MONDAY%2CWEDNESDAY"
 */
export function toJobSearchQuery(filters: JobBrowseFilters): URLSearchParams {
	const query = new URLSearchParams();

	if (filters.query) {
		query.set('q', filters.query);
	}

	if (filters.categoryId) {
		query.set('categoryId', filters.categoryId);
	}

	if (filters.locationId) {
		query.set('locationId', filters.locationId);
	}

	if (filters.daysOfWeek.length > 0) {
		query.set('dayOfWeek', filters.daysOfWeek.join(','));
	}

	if (filters.timeOfDay.length > 0) {
		query.set('timeOfDay', filters.timeOfDay.join(','));
	}

	if (filters.verifiedOnly) {
		query.set('verifiedOnly', 'true');
	}

	if (filters.sort === 'salary_desc') {
		query.set('sort', 'salary_desc');
	}

	return query;
}

/**
 * Builds a `/jobs` link starting from the current filters.
 *
 * Fields named in `changes` replace the current value; `undefined` or `[]`
 * removes that filter. Every other filter is kept.
 *
 * @param jobsPath - The resolved `/jobs` path, so the link respects the base path.
 * @param filters - The filters currently in the URL.
 * @param changes - Only the filters that should differ.
 * @returns The resolved link, with a query string when anything remains.
 */
export function toJobsHref(
	jobsPath: ResolvedPathname,
	filters: JobBrowseFilters,
	changes: Partial<JobBrowseFilters>
): ResolvedPathname {
	const query = toJobSearchQuery({ ...filters, ...changes }).toString();

	return (query ? `${jobsPath}?${query}` : jobsPath) as ResolvedPathname;
}

function readDaysOfWeek(values: string[]): DayOfWeek[] {
	const selected = splitList(values).filter(isDayOfWeek);

	return sortDaysOfWeek(selected);
}

function readTimeOfDay(values: string[]): TimeOfDay[] {
	const selected = splitList(values).filter(isTimeOfDay);

	return TIME_OF_DAY_VALUES.filter((slot) => selected.includes(slot));
}

/** Accepts both repeated parameters and a comma-separated value. */
function splitList(values: string[]): string[] {
	return values.flatMap((value) => value.split(',')).map((value) => value.trim());
}

function readText(value: string | null): string | undefined {
	const trimmed = value?.trim();

	return trimmed ? trimmed : undefined;
}
