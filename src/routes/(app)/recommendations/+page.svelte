<script lang="ts">
	/**
	 * Recommendations (`/recommendations`).
	 *
	 * Two tabs in one place: **Fits my week** is the exact schedule match, and
	 * **For you** is the AI ordering of a profile shortlist. Each tab fetches its
	 * own data in the browser, so the page paints immediately and shows a skeleton
	 * while the request runs.
	 */

	import { untrack } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import { apiGetJson } from '#lib/api/browser.ts';
	import EmptyState from '#lib/components/jobs/EmptyState.svelte';
	import JobRow from '#lib/components/jobs/JobRow.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { formatAvailability } from '#lib/schedule.ts';
	import type { AiSuggestions, JobSummary, Paged } from '#lib/api/types.ts';
	import type { PageProps } from './$types';

	type Tab = 'matches' | 'ai';

	type MatchesState =
		| { name: 'idle' }
		| { name: 'loading' }
		| { name: 'ready'; jobs: JobSummary[]; total: number }
		| { name: 'error'; message: string };

	type SuggestionsState =
		| { name: 'idle' }
		| { name: 'loading' }
		| { name: 'ready'; suggestions: AiSuggestions }
		| { name: 'error'; message: string };

	let { data }: PageProps = $props();

	// The server decides the opening tab; after that the tab is local state.
	let activeTab = $state<Tab>(untrack(() => data.initialTab));
	let matches = $state<MatchesState>({ name: 'idle' });
	let suggestions = $state<SuggestionsState>({ name: 'idle' });

	const availabilityLabel = $derived(
		formatAvailability(data.availability.days, data.availability.timeOfDay)
	);

	const allMatchesHref = $derived.by(() => {
		const query = new SvelteURLSearchParams();

		if (data.availability.days.length > 0) {
			query.set('dayOfWeek', data.availability.days.join(','));
		}

		if (data.availability.timeOfDay.length > 0) {
			query.set('timeOfDay', data.availability.timeOfDay.join(','));
		}

		query.set('scheduleFit', 'true');

		return `${resolve('jobs')}?${query.toString()}`;
	});

	// Load the first tab once the component mounts, then lazily load the other
	// the first time it is opened. Results stay cached for the visit.
	$effect(() => {
		if (activeTab === 'matches' && matches.name === 'idle') {
			void loadMatches();
		}

		if (activeTab === 'ai' && suggestions.name === 'idle') {
			void loadSuggestions();
		}
	});

	async function loadMatches() {
		if (!data.hasAvailability) {
			return;
		}

		matches = { name: 'loading' };

		const query = new SvelteURLSearchParams({ pageSize: '8', scheduleFit: 'true' });

		if (data.availability.days.length > 0) {
			query.set('dayOfWeek', data.availability.days.join(','));
		}

		if (data.availability.timeOfDay.length > 0) {
			query.set('timeOfDay', data.availability.timeOfDay.join(','));
		}

		const result = await apiGetJson<Paged<JobSummary>>(`/api/v1/jobs?${query.toString()}`);

		if (!result.ok) {
			matches = { name: 'error', message: result.message };
			return;
		}

		matches = result.data
			? { name: 'ready', jobs: result.data.items, total: result.data.total }
			: { name: 'error', message: 'The job list was empty.' };
	}

	async function loadSuggestions() {
		suggestions = { name: 'loading' };

		const result = await apiGetJson<AiSuggestions>('/api/v1/me/ai/suggestions');

		if (!result.ok) {
			suggestions = { name: 'error', message: result.message };
			return;
		}

		suggestions = result.data
			? { name: 'ready', suggestions: result.data }
			: { name: 'error', message: 'The suggestion list was empty.' };
	}

	function selectTab(tab: Tab) {
		activeTab = tab;
	}

	/** `[0, 1, … count-1]`, used to render a fixed number of skeleton rows. */
	function skeletonRows(count: number): number[] {
		const rows: number[] = [];

		for (let index = 0; index < count; index += 1) {
			rows.push(index);
		}

		return rows;
	}
</script>

<PageHeader
	title="Recommendations"
	description="Two ways to find a shift: the exact schedule match, and jobs ranked from your profile."
/>

{#snippet JobSkeleton({ rows }: { rows: number })}
	<div aria-busy="true" aria-live="polite" class="mt-6 divide-y divide-rule border-t border-rule">
		{#each skeletonRows(rows) as index (index)}
			<div class="grid gap-4 py-5 sm:grid-cols-[11rem_1fr_auto]">
				<div class="space-y-2">
					<div class="h-4 w-24 animate-pulse rounded bg-ink/10"></div>
					<div class="h-3 w-20 animate-pulse rounded bg-ink/10"></div>
				</div>
				<div class="space-y-2">
					<div class="h-5 w-2/3 animate-pulse rounded bg-ink/10"></div>
					<div class="h-3 w-1/2 animate-pulse rounded bg-ink/10"></div>
				</div>
				<div class="h-4 w-20 animate-pulse rounded bg-ink/10"></div>
			</div>
		{/each}
	</div>
{/snippet}

<div class="flex flex-wrap gap-2 border-b border-rule pb-3" role="tablist">
	<button
		aria-selected={activeTab === 'matches'}
		class="rounded-md px-3 py-1.5 text-sm"
		class:bg-slate-900={activeTab === 'matches'}
		class:font-medium={activeTab === 'matches'}
		class:text-white={activeTab === 'matches'}
		class:text-slate-600={activeTab !== 'matches'}
		onclick={() => selectTab('matches')}
		role="tab"
		type="button"
	>
		Fits my week
	</button>
	<button
		aria-selected={activeTab === 'ai'}
		class="rounded-md px-3 py-1.5 text-sm"
		class:bg-slate-900={activeTab === 'ai'}
		class:font-medium={activeTab === 'ai'}
		class:text-white={activeTab === 'ai'}
		class:text-slate-600={activeTab !== 'ai'}
		onclick={() => selectTab('ai')}
		role="tab"
		type="button"
	>
		For you
	</button>
</div>

{#if activeTab === 'matches'}
	{#if !data.hasAvailability}
		<EmptyState
			title="Tell us when you are free"
			description="Add your free days and time blocks on your student profile, then come back for a list you can actually work."
			actionLabel="Set your free time"
			actionHref={resolve('me/profile')}
		/>
	{:else}
		<div class="mt-5 flex flex-wrap items-center gap-3 border-l-4 border-chalk bg-card px-4 py-3">
			<Badge class="bg-chalk/15 text-chalk" variant="ghost">Your availability</Badge>
			<p class="text-sm text-ink/80">{availabilityLabel}</p>
			<a class="text-sm font-medium text-chalk hover:underline" href={resolve('me/profile')}>
				Change
			</a>
		</div>

		{#if matches.name === 'idle' || matches.name === 'loading'}
			{@render JobSkeleton({ rows: 4 })}
		{:else if matches.name === 'error'}
			<p class="mt-6 text-sm text-ink/70">{matches.message}</p>
		{:else if matches.name === 'ready'}
			{#if matches.jobs.length > 0}
				<div class="mt-6 divide-y divide-rule border-t border-rule">
					{#each matches.jobs as job (job.id)}
						<JobRow {job} />
					{/each}
				</div>

				<div class="mt-6 flex flex-wrap items-center gap-4">
					<p class="text-sm text-ink/60">
						Showing {matches.jobs.length} of {matches.total} matching shifts.
					</p>
					<Button href={allMatchesHref} size="sm" variant="outline">See all matches</Button>
				</div>
			{:else}
				<EmptyState
					title="No open shifts fit that schedule yet"
					description="Widen a block or a day on your profile, or browse every shift in the meantime."
					actionLabel="Change my free time"
					actionHref={resolve('me/profile')}
				/>
			{/if}
		{/if}
	{/if}
{:else}
	{#if suggestions.name === 'idle' || suggestions.name === 'loading'}
		{@render JobSkeleton({ rows: 3 })}
	{:else if suggestions.name === 'error'}
		<p class="mt-6 text-sm text-ink/70">{suggestions.message}</p>
	{:else if suggestions.name === 'ready'}
		<div class="mt-5 flex flex-wrap items-center gap-3">
			<Badge
				class={suggestions.suggestions.source === 'AI'
					? 'bg-chalk/15 text-chalk'
					: 'bg-ink/10 text-ink/70'}
				variant="ghost"
			>
				{suggestions.suggestions.source === 'AI' ? 'Ranked by AI' : 'Local ranking'}
			</Badge>
			<p class="text-sm text-ink/60">
				{suggestions.suggestions.items.length}
				{suggestions.suggestions.items.length === 1 ? 'suggestion' : 'suggestions'}
			</p>
		</div>

		{#if suggestions.suggestions.notice && suggestions.suggestions.items.length > 0}
			<p class="mt-4 border-l-4 border-rule bg-card px-4 py-3 text-sm text-ink/70">
				{suggestions.suggestions.notice}
			</p>
		{/if}

		{#if suggestions.suggestions.items.length > 0}
			<div class="mt-6 divide-y divide-rule border-t border-rule">
				{#each suggestions.suggestions.items as item (item.job.id)}
					<JobRow job={item.job} />
				{/each}
			</div>

			<p class="mt-6 text-sm text-ink/60">
				These are suggestions, not a guarantee.
				<a class="underline" href={resolve('jobs')}>Browse all open shifts</a> to see everything.
			</p>
		{:else}
			<EmptyState
				title="No suggestions right now"
				description={suggestions.suggestions.notice ??
					'No open jobs match your profile at the moment.'}
				actionLabel="Browse all open shifts"
				actionHref={resolve('jobs')}
			/>
		{/if}
	{/if}
{/if}
