<script lang="ts">
	/**
	 * Home (`/`).
	 *
	 * Composes the hero, category shortcuts, the newest open shifts and the work-record pitch. All
	 * data comes from `+page.server.ts`; this file owns layout only.
	 */

	import { resolve } from '$app/paths';
	import CategoryRail from '#lib/components/home/CategoryRail.svelte';
	import HomeHero from '#lib/components/home/HomeHero.svelte';
	import EmptyState from '#lib/components/jobs/EmptyState.svelte';
	import JobRow from '#lib/components/jobs/JobRow.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const jobsPath = resolve('jobs');
</script>

<HomeHero isSignedIn={data.user !== null} />

<section class="mt-10">
	<div class="flex items-baseline justify-between gap-4 border-b border-rule pb-2">
		<h2 class="text-base font-semibold">Browse by category</h2>
	</div>

	<div class="mt-4">
		<CategoryRail categories={data.categories} />
	</div>
</section>

<section class="mt-10">
	<div class="flex items-baseline justify-between gap-4 border-b border-rule pb-2">
		<h2 class="text-base font-semibold">Latest shifts</h2>
		<a class="text-sm font-medium text-chalk hover:underline" href={jobsPath}>
			See all {data.latestJobs.total} open shifts
		</a>
	</div>

	{#if data.latestJobs.items.length > 0}
		<div class="divide-y divide-rule">
			{#each data.latestJobs.items as job (job.id)}
				<JobRow {job} />
			{/each}
		</div>
	{:else}
		<EmptyState
			title="No open shifts right now"
			description="New part-time jobs appear here as soon as an employer posts them."
			actionLabel="Browse all jobs"
			actionHref={resolve('jobs')}
		/>
	{/if}
</section>

<section
	class="mt-10 grid gap-6 border-t-4 border-chalk bg-card p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8"
>
	<div>
		<p class="text-sm font-semibold tracking-wide text-chalk uppercase">Work records</p>
		<h2 class="mt-2 text-2xl font-bold tracking-tight">A finished shift, signed.</h2>
		<p class="mt-2 max-w-xl text-sm text-ink/70">
			After a completed job, the employer reviews the student and signs a record of the dates, the
			rating and the comment. Students can publish it and anyone can check the signature.
		</p>
	</div>

	<a class="font-medium text-chalk hover:underline" href={resolve('work-records')}>
		See public records
	</a>
</section>
