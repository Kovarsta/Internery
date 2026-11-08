<script lang="ts">
	/**
	 * Filter bar for `/jobs`.
	 *
	 * A plain GET form: the filters live in the URL, the page works without JavaScript, and a
	 * shared link reproduces the same result. Days are OR-ed and time-of-day blocks are OR-ed;
	 * the two groups combine with AND. Active filters are shown as removable chips.
	 */

	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Checkbox } from '#lib/components/ui/checkbox/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { NativeSelect, NativeSelectOption } from '#lib/components/ui/native-select/index.ts';
	import type { Category } from '#lib/api/types.ts';
	import { toJobSearchQuery, type JobBrowseFilters } from '#lib/job-search.ts';
	import {
		DAY_OF_WEEK_LABELS,
		DAY_OF_WEEK_VALUES,
		TIME_OF_DAY_LABELS,
		TIME_OF_DAY_VALUES,
		WEEKDAYS,
		WEEKEND_DAYS,
		type DayOfWeek
	} from '#lib/schedule.ts';

	/**
	 * One removable chip under the form.
	 *
	 * `label` is what the student sees; `removeHref` is the `/jobs` link that
	 * keeps every other filter and drops only this one.
	 */
	type ActiveFilter = {
		label: string;
		removeHref: ResolvedPathname;
	};

	let { categories, filters }: { categories: Category[]; filters: JobBrowseFilters } = $props();

	/** The resolved path every form action and link on this page points at. */
	const jobsPath = resolve('jobs');

	const activeFilters = $derived(buildActiveFilters());

	/**
	 * Builds a `/jobs` link starting from the filters currently in the URL.
	 *
	 * Set a field to `undefined`, or a list to `[]`, to remove that filter from
	 * the link. Every field not named in `changes` is preserved.
	 *
	 * @param changes - Only the filters that should differ from the current URL.
	 * @returns The resolved `/jobs` path, with a query string when anything remains.
	 *
	 * @example
	 * // Current URL: /jobs?location=Hanoi&dayOfWeek=SATURDAY
	 * hrefWith({ daysOfWeek: WEEKDAYS });
	 * // "/jobs?location=Hanoi&dayOfWeek=MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY"
	 */
	function hrefWith(changes: Partial<JobBrowseFilters>): ResolvedPathname {
		const query = toJobSearchQuery({ ...filters, ...changes }).toString();

		// The caller resolved the path; the query string is runtime data.
		return (query ? `${jobsPath}?${query}` : jobsPath) as ResolvedPathname;
	}

	/**
	 * Builds a link that selects one of the day presets.
	 *
	 * @param days - The exact days to select, for example `WEEKDAYS` or `WEEKEND_DAYS`.
	 * @returns The `/jobs` link with those days selected and every other filter kept.
	 */
	function presetHref(days: DayOfWeek[]): ResolvedPathname {
		return hrefWith({ daysOfWeek: days });
	}

	/**
	 * Describes the filters currently applied, one chip per value.
	 *
	 * A selected day or time block becomes its own chip, so removing one does
	 * not clear the others. The order matches the screen: keyword, category,
	 * location, days, time blocks, verified.
	 *
	 * @returns The chips to render, or an empty array when no filters are active.
	 */
	function buildActiveFilters(): ActiveFilter[] {
		const chips: ActiveFilter[] = [];

		if (filters.query) {
			chips.push({ label: `“${filters.query}”`, removeHref: hrefWith({ query: undefined }) });
		}

		if (filters.categoryId) {
			const category = categories.find((entry) => entry.id === filters.categoryId);

			chips.push({
				label: category?.name ?? 'Category',
				removeHref: hrefWith({ categoryId: undefined })
			});
		}

		if (filters.location) {
			chips.push({ label: filters.location, removeHref: hrefWith({ location: undefined }) });
		}

		for (const day of filters.daysOfWeek) {
			chips.push({
				label: DAY_OF_WEEK_LABELS[day],
				removeHref: hrefWith({
					daysOfWeek: filters.daysOfWeek.filter((entry) => entry !== day)
				})
			});
		}

		for (const slot of filters.timeOfDay) {
			chips.push({
				label: TIME_OF_DAY_LABELS[slot],
				removeHref: hrefWith({
					timeOfDay: filters.timeOfDay.filter((entry) => entry !== slot)
				})
			});
		}

		if (filters.verifiedOnly) {
			chips.push({ label: 'Verified employers', removeHref: hrefWith({ verifiedOnly: false }) });
		}

		return chips;
	}
</script>

<form action={jobsPath} class="border border-rule bg-card p-4" method="GET">
	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
		<div class="min-w-0">
			<Label class="mb-1" for="job-q">Keyword</Label>
			<Input
				class="bg-card"
				id="job-q"
				name="q"
				placeholder="Barista, tutor, event staff"
				type="search"
				value={filters.query ?? ''}
			/>
		</div>

		<div class="min-w-0">
			<Label class="mb-1" for="job-category">Category</Label>
			<NativeSelect
				class="w-full"
				id="job-category"
				name="categoryId"
				value={filters.categoryId ?? ''}
			>
				<NativeSelectOption value="">Any category</NativeSelectOption>
				{#each categories as category (category.id)}
					<NativeSelectOption value={category.id}>{category.name}</NativeSelectOption>
				{/each}
			</NativeSelect>
		</div>

		<div class="min-w-0">
			<Label class="mb-1" for="job-location">Location</Label>
			<Input
				class="bg-card"
				id="job-location"
				name="location"
				placeholder="Hanoi"
				value={filters.location ?? ''}
			/>
		</div>

		<div class="min-w-0">
			<Label class="mb-1" for="job-sort">Sort</Label>
			<NativeSelect class="w-full" id="job-sort" name="sort" value={filters.sort}>
				<NativeSelectOption value="newest">Newest first</NativeSelectOption>
				<NativeSelectOption value="salary_desc">Highest pay</NativeSelectOption>
			</NativeSelect>
		</div>

		<div class="flex min-w-0 flex-col justify-end gap-2 sm:col-span-2 lg:col-span-1">
			<div class="flex items-center gap-2">
				<Checkbox
					checked={filters.verifiedOnly}
					id="job-verified"
					name="verifiedOnly"
					value="true"
				/>
				<Label for="job-verified">Verified employers</Label>
			</div>
			<Button class="w-full" type="submit">Search shifts</Button>
		</div>

		<fieldset class="min-w-0 sm:col-span-2 lg:col-span-3">
			<legend class="mb-2 text-sm font-medium">Days</legend>
			<div class="flex flex-wrap gap-x-4 gap-y-2">
				{#each DAY_OF_WEEK_VALUES as day (day)}
					<div class="flex items-center gap-2">
						<Checkbox
							checked={filters.daysOfWeek.includes(day)}
							id={`job-day-${day}`}
							name="dayOfWeek"
							value={day}
						/>
						<Label for={`job-day-${day}`}>{DAY_OF_WEEK_LABELS[day]}</Label>
					</div>
				{/each}
			</div>
			<p class="mt-2 text-xs text-ink/60">
				Shortcuts:
				<a class="font-medium text-chalk hover:underline" href={presetHref(WEEKDAYS)}>Weekdays</a>
				<span class="mx-1" aria-hidden="true">·</span>
				<a class="font-medium text-chalk hover:underline" href={presetHref(WEEKEND_DAYS)}>
					Weekend
				</a>
			</p>
		</fieldset>

		<fieldset class="min-w-0 sm:col-span-2 lg:col-span-2">
			<legend class="mb-2 text-sm font-medium">Time of day</legend>
			<div class="flex flex-wrap gap-x-4 gap-y-2">
				{#each TIME_OF_DAY_VALUES as slot (slot)}
					<div class="flex items-center gap-2">
						<Checkbox
							checked={filters.timeOfDay.includes(slot)}
							id={`job-time-${slot}`}
							name="timeOfDay"
							value={slot}
						/>
						<Label for={`job-time-${slot}`}>{TIME_OF_DAY_LABELS[slot]}</Label>
					</div>
				{/each}
			</div>
		</fieldset>
	</div>
</form>

{#if activeFilters.length > 0}
	<div class="mt-3 flex flex-wrap items-center gap-2 text-sm">
		<span class="text-ink/60">Active:</span>
		{#each activeFilters as chip (`${chip.label}-${chip.removeHref}`)}
			<a
				class="inline-flex items-center gap-1 rounded-full border border-rule px-3 py-1 hover:border-ink/40"
				href={chip.removeHref}
				aria-label={`Remove ${chip.label} filter`}
			>
				{chip.label}
				<span aria-hidden="true">×</span>
			</a>
		{/each}
		<a class="ml-1 font-medium text-chalk hover:underline" href={jobsPath}>Clear all</a>
	</div>
{/if}
