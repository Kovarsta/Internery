<script lang="ts">
	/**
	 * Admin moderation (`/admin/moderation`).
	 *
	 * Lists jobs from `GET /admin/moderation-queue`: hidden, reported or flagged
	 * by the scam scan. Each row explains why the job is here and offers the
	 * matching action.
	 */

	import { resolve } from '$app/paths';
	import EmptyState from '#lib/components/jobs/EmptyState.svelte';
	import ModerationRow from '#lib/components/admin/ModerationRow.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Pagination from '#lib/components/jobs/Pagination.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const total = $derived(data.items.total);
	const hasSearch = $derived(data.search !== '');
	const summary = $derived(
		`${total} ${total === 1 ? 'job needs' : 'jobs need'} attention${hasSearch ? ' with that title' : ''}.`
	);
</script>

<PageHeader
	title="Moderation"
	description="Hidden, reported and flagged jobs, oldest first. Restoring a job or clearing its flag resolves the open reports."
/>

<form class="mb-4 flex flex-wrap items-end gap-2" method="get">
	<div class="min-w-56 flex-1">
		<Label class="mb-1" for="moderation-search">Job title</Label>
		<Input
			id="moderation-search"
			maxlength={100}
			name="q"
			placeholder="Barista, event staff..."
			type="search"
			value={data.search}
		/>
	</div>

	<Button size="sm" type="submit">Search</Button>
	{#if hasSearch}
		<Button href={resolve('admin/moderation')} size="sm" variant="ghost">Clear</Button>
	{/if}
</form>

<p class="text-sm text-ink/70">{summary}</p>

{#if data.items.items.length > 0}
	<div class="mt-2 divide-y divide-rule border-t border-rule">
		{#each data.items.items as item (item.job.id)}
			<ModerationRow {item} />
		{/each}
	</div>

	<Pagination
		basePath={resolve('admin/moderation')}
		page={data.items.page}
		pageSize={data.items.pageSize}
		query={data.filterQuery}
		total={data.items.total}
	/>
{:else}
	<EmptyState
		title={hasSearch ? 'No matching jobs' : 'Nothing to review'}
		description={hasSearch
			? 'No flagged job has that title. Try a shorter search or clear it.'
			: 'No job is hidden, reported or flagged right now.'}
		actionLabel={hasSearch ? 'Clear search' : 'Back to admin'}
		actionHref={hasSearch ? resolve('admin/moderation') : resolve('admin')}
	/>
{/if}
