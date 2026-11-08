<script lang="ts">
	/**
	 * Filter bar for `/jobs`.
	 *
	 * A plain GET form: the filters live in the URL, the page works without JavaScript, and a
	 * shared link reproduces the same result. Days are OR-ed and time-of-day blocks are OR-ed;
	 * the two groups combine with AND. The removable chips live in `ActiveFilters`.
	 */

	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import SearchSelect from '#lib/components/SearchSelect.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Checkbox } from '#lib/components/ui/checkbox/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { NativeSelect, NativeSelectOption } from '#lib/components/ui/native-select/index.ts';
	import type { Category } from '#lib/api/types.ts';
	import { toJobsHref, type JobBrowseFilters } from '#lib/job-search.ts';
	import {
		DAY_OF_WEEK_LABELS,
		DAY_OF_WEEK_VALUES,
		TIME_OF_DAY_LABELS,
		TIME_OF_DAY_VALUES,
		WEEKDAYS,
		WEEKEND_DAYS,
		type DayOfWeek
	} from '#lib/schedule.ts';

	let { categories, filters }: { categories: Category[]; filters: JobBrowseFilters } = $props();

	const categoryOptions = $derived(
		categories.map((category) => ({ value: category.id, label: category.name }))
	);

	/** The resolved path every form action and link on this page points at. */
	const jobsPath = resolve('jobs');

	/**
	 * Builds a link that selects one of the day presets.
	 *
	 * @param days - The exact days to select, for example `WEEKDAYS` or `WEEKEND_DAYS`.
	 * @returns The `/jobs` link with those days selected and every other filter kept.
	 */
	function presetHref(days: DayOfWeek[]): ResolvedPathname {
		return toJobsHref(jobsPath, filters, { daysOfWeek: days });
	}
</script>

<form action={jobsPath} class="border border-rule bg-card p-4" method="GET">
	<div class="grid gap-3">
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
			<SearchSelect
				allowEmpty
				class="w-full"
				emptyLabel="All categories"
				id="job-category"
				items={categoryOptions}
				name="categoryId"
				placeholder="All categories"
				value={filters.categoryId ?? ''}
			/>
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

		<fieldset class="min-w-0">
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

		<fieldset class="min-w-0">
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

		<div class="flex items-center gap-2">
			<Checkbox checked={filters.verifiedOnly} id="job-verified" name="verifiedOnly" value="true" />
			<Label for="job-verified">Verified employers</Label>
		</div>

		<Button class="w-full" type="submit">Search shifts</Button>
	</div>
</form>
