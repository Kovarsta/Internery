<script lang="ts">
	/**
	 * Fits my week (`/fits-my-week`).
	 *
	 * Lists open jobs whose whole shift sits inside the student's saved free days
	 * and time blocks. The page is the destination for the availability entered on
	 * `/me/profile`; it is a query, not an AI feature, so the list is exact.
	 */

	import { resolve } from '$app/paths';
	import EmptyState from '#lib/components/jobs/EmptyState.svelte';
	import JobRow from '#lib/components/jobs/JobRow.svelte';
	import Pagination from '#lib/components/jobs/Pagination.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { formatAvailability } from '#lib/schedule.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const total = $derived(data.jobs?.total ?? 0);
</script>

<PageHeader
	title="Fits my week"
	description="Open jobs you can work with the free time saved on your profile. The whole shift has to fit, not just overlap."
/>

{#if data.needsAvailability}
	<EmptyState
		title="Tell us when you are free"
		description="Add your free days and time blocks on your student profile, then come back for a list you can actually work."
		actionLabel="Set your free time"
		actionHref={resolve('me/profile')}
	/>
{:else if data.availability}
	<div class="flex flex-wrap items-center gap-3 border-l-4 border-chalk bg-card px-4 py-3">
		<Badge class="bg-chalk/15 text-chalk" variant="ghost">Your availability</Badge>
		<p class="text-sm text-ink/80">
			{formatAvailability(data.availability.days, data.availability.timeOfDay)}
		</p>
		<a class="text-sm font-medium text-chalk hover:underline" href={resolve('me/profile')}>
			Change
		</a>
	</div>

	<div class="mt-6 flex items-baseline justify-between border-b border-rule pb-2">
		<h2 class="text-base font-semibold">
			{total}
			{total === 1 ? 'shift fits' : 'shifts fit'} your free time
		</h2>
		<p class="text-sm text-ink/60">Newest first</p>
	</div>

	{#if data.jobs && data.jobs.items.length > 0}
		<div class="divide-y divide-rule">
			{#each data.jobs.items as job (job.id)}
				<JobRow {job} />
			{/each}
		</div>

		<Pagination
			basePath={resolve('fits-my-week')}
			page={data.page}
			pageSize={data.pageSize}
			{total}
			query={data.paginationQuery}
		/>
	{:else}
		<EmptyState
			title="No open shifts fit that schedule yet"
			description="Widen a block or a day on your profile, or browse every shift in the meantime."
			actionLabel="Change my free time"
			actionHref={resolve('me/profile')}
		/>
	{/if}

	<div class="mt-8">
		<Button href={resolve('jobs')} variant="outline">Browse all open shifts</Button>
	</div>
{/if}
