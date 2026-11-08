<script lang="ts">
	/**
	 * Active filter chips.
	 *
	 * The same list is rendered in two places: under the form in the desktop
	 * sidebar, and as a sticky bar above the results on smaller screens. The bar
	 * keeps removal reachable after the filter panel has scrolled away, and its
	 * Edit link jumps back to the panel.
	 */

	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import type { Category } from '#lib/api/types.ts';
	import { toJobsHref, type JobBrowseFilters } from '#lib/job-search.ts';
	import { DAY_OF_WEEK_LABELS, TIME_OF_DAY_LABELS } from '#lib/schedule.ts';

	type ActiveFilter = {
		label: string;
		removeHref: ResolvedPathname;
	};

	type Props = {
		filters: JobBrowseFilters;
		categories: Category[];
		/** Display name for the selected location id. */
		locationLabel?: string;
		/** `bar` is the sticky small-screen variant; `sidebar` sits under the form. */
		variant?: 'sidebar' | 'bar';
	};

	let { filters, categories, locationLabel = '', variant = 'sidebar' }: Props = $props();

	const jobsPath = resolve('jobs');
	const editHref = `${jobsPath}#filters` as ResolvedPathname;

	const chips = $derived(buildChips());

	function buildChips(): ActiveFilter[] {
		const result: ActiveFilter[] = [];

		if (filters.query) {
			result.push(chip(`“${filters.query}”`, { query: undefined }));
		}

		if (filters.categoryId) {
			const category = categories.find((entry) => entry.id === filters.categoryId);

			result.push(chip(category?.name ?? 'Category', { categoryId: undefined }));
		}

		if (filters.locationId) {
			result.push(chip(locationLabel || 'Location', { locationId: undefined }));
		}

		for (const day of filters.daysOfWeek) {
			result.push(
				chip(DAY_OF_WEEK_LABELS[day], {
					daysOfWeek: filters.daysOfWeek.filter((entry) => entry !== day)
				})
			);
		}

		for (const slot of filters.timeOfDay) {
			result.push(
				chip(TIME_OF_DAY_LABELS[slot], {
					timeOfDay: filters.timeOfDay.filter((entry) => entry !== slot)
				})
			);
		}

		if (filters.verifiedOnly) {
			result.push(chip('Verified employers', { verifiedOnly: false }));
		}

		return result;
	}

	function chip(label: string, changes: Partial<JobBrowseFilters>): ActiveFilter {
		return { label, removeHref: toJobsHref(jobsPath, filters, changes) };
	}
</script>

{#if chips.length > 0}
	{#if variant === 'bar'}
		<div
			class="sticky top-14 z-10 -mx-4 border-b border-rule bg-paper/95 px-4 py-2 backdrop-blur lg:hidden"
		>
			<div class="flex items-center gap-2 overflow-x-auto text-sm">
				<span class="shrink-0 text-ink/60">Active:</span>
				{#each chips as active (`${active.label}-${active.removeHref}`)}
					<a
						class="inline-flex shrink-0 items-center gap-1 rounded-full border border-rule bg-card px-3 py-1 hover:border-ink/40"
						href={active.removeHref}
						aria-label={`Remove ${active.label} filter`}
					>
						{active.label}
						<span aria-hidden="true">×</span>
					</a>
				{/each}
				<a
					class="ml-auto shrink-0 font-medium text-chalk hover:underline"
					href={editHref}
					aria-label="Edit filters"
				>
					Edit
				</a>
				<a
					class="shrink-0 font-medium text-ink/60 hover:underline"
					href={jobsPath}
					aria-label="Clear all filters"
				>
					Clear
				</a>
			</div>
		</div>
	{:else}
		<div class="flex flex-wrap items-center gap-2 text-sm">
			<span class="text-ink/60">Active:</span>
			{#each chips as active (`${active.label}-${active.removeHref}`)}
				<a
					class="inline-flex items-center gap-1 rounded-full border border-rule px-3 py-1 hover:border-ink/40"
					href={active.removeHref}
					aria-label={`Remove ${active.label} filter`}
				>
					{active.label}
					<span aria-hidden="true">×</span>
				</a>
			{/each}
			<a class="ml-1 font-medium text-chalk hover:underline" href={jobsPath}>Clear all</a>
		</div>
	{/if}
{/if}
