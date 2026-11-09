<script lang="ts">
	/**
	 * Home (`/`).
	 *
	 * Composes the pitch hero, hot shifts, category shortcuts, the three-step
	 * explanation, fresh shifts and the employer call to action. All data comes
	 * from `+page.server.ts`; this file owns layout only.
	 */

	import { resolve } from '$app/paths';
	import CategoryRail from '#lib/components/home/CategoryRail.svelte';
	import FeaturedJobCard from '#lib/components/home/FeaturedJobCard.svelte';
	import HomeHero from '#lib/components/home/HomeHero.svelte';
	import HowItWorks from '#lib/components/home/HowItWorks.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import EmptyState from '#lib/components/jobs/EmptyState.svelte';
	import JobRow from '#lib/components/jobs/JobRow.svelte';
	import type { Category } from '#lib/api/types.ts';
	import type { PageProps } from './$types';

	/** Keep the demo's core categories visible instead of taking the first ten alphabetically. */
	const HOME_CATEGORY_NAMES = [
		'Food & Beverage',
		'Retail',
		'Tutoring',
		'Events',
		'Hospitality & Tourism',
		'Office & Admin',
		'Customer Service',
		'Delivery & Logistics',
		'Sales',
		'Marketing & Social Media'
	];

	let { data }: PageProps = $props();

	const jobsPath = resolve('jobs');
	const heroJob = $derived(data.featuredJobs.items[0] ?? null);
	const hotJobs = $derived(data.featuredJobs.items.slice(1, 4));
	const isEmployer = $derived(data.user?.role === 'EMPLOYER');

	const featuredIds = $derived(new Set(data.featuredJobs.items.map((job) => job.id)));
	const freshJobs = $derived(
		data.latestJobs.items.filter((job) => !featuredIds.has(job.id)).slice(0, 4)
	);

	const homeCategories = $derived.by(() => {
		const byName = new Map(data.categories.map((category) => [category.name, category]));
		const preferredNames = new Set(HOME_CATEGORY_NAMES);
		const preferred = HOME_CATEGORY_NAMES.map((name) => byName.get(name)).filter(
			(category): category is Category => category !== undefined
		);
		const rest = data.categories.filter((category) => !preferredNames.has(category.name));

		return [...preferred, ...rest];
	});
</script>

<HomeHero
	featuredJob={heroJob}
	isSignedIn={data.user !== null}
	openShiftCount={data.latestJobs.total}
/>

{#if hotJobs.length > 0}
	<section class="mt-12">
		<div class="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-2">
			<div>
				<h2 class="text-2xl font-bold tracking-tight">Hot shifts this week</h2>
				<p class="mt-1 text-sm text-ink/60">
					Fresh roles and the shifts students are opening most.
				</p>
			</div>
			<a class="text-sm font-medium text-chalk hover:underline" href={jobsPath}>See all shifts</a>
		</div>

		<div class="mt-5 grid gap-4 md:grid-cols-3">
			{#each hotJobs as job (job.id)}
				<FeaturedJobCard {job} />
			{/each}
		</div>
	</section>
{/if}

<section class="mt-12">
	<div class="flex items-baseline justify-between gap-4 border-b border-rule pb-2">
		<h2 class="text-2xl font-bold tracking-tight">Browse by category</h2>
	</div>

	<div class="mt-4">
		<CategoryRail categories={homeCategories} limit={10} />
	</div>
</section>

<HowItWorks />

<section class="mt-12">
	<div class="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-2">
		<h2 class="text-2xl font-bold tracking-tight">Fresh shifts</h2>
		<a class="text-sm font-medium text-chalk hover:underline" href={jobsPath}>
			See all {data.latestJobs.total} open shifts
		</a>
	</div>

	{#if freshJobs.length > 0}
		<div class="divide-y divide-rule">
			{#each freshJobs as job (job.id)}
				<JobRow {job} />
			{/each}
		</div>
	{:else}
		<EmptyState
			title="No open shifts right now"
			description="New part-time jobs appear here as soon as an employer posts them."
			actionLabel="Browse all jobs"
			actionHref={jobsPath}
		/>
	{/if}
</section>

{#if !data.user || isEmployer}
	<section
		class="mt-12 flex flex-col gap-5 border-t-4 border-chalk bg-card p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"
	>
		<div>
			<h2 class="text-2xl font-bold tracking-tight">Hiring students?</h2>
			<p class="mt-2 max-w-xl text-sm text-ink/70">
				Post a shift, review applicants and close applications when you have enough people. Students
				apply with a profile, not a cover letter.
			</p>
		</div>

		<Button
			class="shrink-0"
			href={isEmployer ? resolve('employer/jobs/new') : resolve('register')}
			size="lg"
		>
			{isEmployer ? 'Post a shift' : 'Create an employer account'}
		</Button>
	</section>
{/if}
