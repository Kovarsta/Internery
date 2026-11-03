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
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const total = $derived(data.items.total);
</script>

<PageHeader
	title="Moderation"
	description="Hidden, reported and flagged jobs, oldest first. Restoring a job or clearing its flag resolves the open reports."
/>

<p class="text-sm text-ink/70">
	{total}
	{total === 1 ? 'job needs' : 'jobs need'} attention.
</p>

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
		query=""
		total={data.items.total}
	/>
{:else}
	<EmptyState
		title="Nothing to review"
		description="No job is hidden, reported or flagged right now."
		actionLabel="Back to admin"
		actionHref={resolve('admin')}
	/>
{/if}
