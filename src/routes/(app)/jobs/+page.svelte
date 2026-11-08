<script lang="ts">
	/**
	 * Job search (`/jobs`).
	 *
	 * Composes the hero, the filter panel and the result rows. On large screens the panel is a
	 * sticky sidebar, so the filters stay reachable while the results scroll. On small screens
	 * the panel sits above the results and the active filters follow the scroll as a sticky bar.
	 * All data comes from `+page.server.ts`.
	 */

	import { resolve } from '$app/paths';
	import ActiveFilters from '#lib/components/jobs/ActiveFilters.svelte';
	import EmptyState from '#lib/components/jobs/EmptyState.svelte';
	import JobFilters from '#lib/components/jobs/JobFilters.svelte';
	import JobRow from '#lib/components/jobs/JobRow.svelte';
	import JobsHero from '#lib/components/jobs/JobsHero.svelte';
	import Pagination from '#lib/components/jobs/Pagination.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<JobsHero />

<div class="mt-8 grid gap-6 lg:grid-cols-[18rem_1fr] lg:items-start">
	<aside id="filters" class="scroll-mt-20 lg:sticky lg:top-20 lg:self-start">
		<h2 class="mb-3 text-sm font-semibold">Filters</h2>
		<JobFilters categories={data.categories} filters={data.filters} />
		<div class="mt-3 hidden lg:block">
			<ActiveFilters categories={data.categories} filters={data.filters} />
		</div>
	</aside>

	<section>
		<ActiveFilters categories={data.categories} filters={data.filters} variant="bar" />

		<div class="flex items-baseline justify-between border-b border-rule pb-2">
			<h2 class="text-base font-semibold">
				{data.jobs.total} open {data.jobs.total === 1 ? 'shift' : 'shifts'}
			</h2>
			<p class="text-sm text-ink/60">
				{data.filters.sort === 'salary_desc' ? 'Highest pay first' : 'Newest first'}
			</p>
		</div>

		{#if data.jobs.items.length > 0}
			<div class="divide-y divide-rule">
				{#each data.jobs.items as job (job.id)}
					<JobRow {job} />
				{/each}
			</div>
		{:else}
			<EmptyState
				title="No shifts match those filters"
				description="Try a different category or location, or clear the filters to see every open job."
				actionLabel="Clear filters"
				actionHref={resolve('jobs')}
			/>
		{/if}

		<Pagination
			basePath={resolve('jobs')}
			page={data.page}
			pageSize={data.pageSize}
			total={data.jobs.total}
			query={data.paginationQuery}
		/>
	</section>
</div>
