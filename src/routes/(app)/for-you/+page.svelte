<script lang="ts">
	/**
	 * For you (`/for-you`).
	 *
	 * The student suggestion list. It is a top-level page, not a tab of the
	 * account area, because it is somewhere a student returns to rather than a
	 * setting. The API returns either an AI-ranked shortlist or the local
	 * fallback; the source badge and notice keep that visible instead of hiding
	 * why the order changed.
	 */

	import { resolve } from '$app/paths';
	import EmptyState from '#lib/components/jobs/EmptyState.svelte';
	import JobRow from '#lib/components/jobs/JobRow.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const suggestions = $derived(data.suggestions);
</script>

<PageHeader
	title="For you"
	description="Open jobs chosen from your major and skills. AI orders the shortlist; the list itself stays small."
/>

{#if data.needsMajor}
	<EmptyState
		title="Add your major first"
		description="Suggested jobs use your major and skills to choose a shortlist. Add them to your student profile, then come back."
		actionLabel="Open student profile"
		actionHref={resolve('me/profile')}
	/>
{:else if suggestions}
	<div class="flex flex-wrap items-center gap-3">
		<Badge
			class={suggestions.source === 'AI' ? 'bg-chalk/15 text-chalk' : 'bg-ink/10 text-ink/70'}
			variant="ghost"
		>
			{suggestions.source === 'AI' ? 'AI ranked' : 'Local ranking'}
		</Badge>
		<p class="text-sm text-ink/60">
			{suggestions.items.length}
			{suggestions.items.length === 1 ? 'suggestion' : 'suggestions'}
		</p>
	</div>

	{#if suggestions.notice && suggestions.items.length > 0}
		<Alert class="mt-5">
			<AlertTitle>AI ranking is not available</AlertTitle>
			<AlertDescription>{suggestions.notice}</AlertDescription>
		</Alert>
	{/if}

	{#if suggestions.items.length > 0}
		<div class="mt-6 divide-y divide-rule border-t border-rule">
			{#each suggestions.items as item (item.job.id)}
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
			description={suggestions.notice ?? 'No open jobs match your profile at the moment.'}
			actionLabel="Browse all open shifts"
			actionHref={resolve('jobs')}
		/>
	{/if}
{/if}
