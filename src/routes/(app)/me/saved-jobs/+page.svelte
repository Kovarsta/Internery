<script lang="ts">
	/**
	 * Saved jobs (`/me/saved-jobs`).
	 *
	 * Lists `GET /me/saved-jobs`, newest save first. Closed jobs stay in the list with their
	 * status; each row owns removing its bookmark.
	 */

	import { resolve } from '$app/paths';
	import EmptyState from '#lib/components/jobs/EmptyState.svelte';
	import JobRow from '#lib/components/jobs/JobRow.svelte';
	import Pagination from '#lib/components/jobs/Pagination.svelte';
	import RemoveSavedJobButton from '#lib/components/jobs/RemoveSavedJobButton.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const total = $derived(data.jobs.total);
</script>

<h1 class="text-3xl font-extrabold tracking-tight">Saved jobs</h1>
<p class="mt-2 text-ink/70">
	{total}
	{total === 1 ? 'saved job' : 'saved jobs'}. Hidden jobs are removed from this list.
</p>

{#if data.jobs.items.length > 0}
	<div class="mt-6 divide-y divide-rule border-t border-rule">
		{#each data.jobs.items as job (job.id)}
			<JobRow {job}>
				<RemoveSavedJobButton jobId={job.id} />
			</JobRow>
		{/each}
	</div>
{:else}
	<EmptyState
		title="No saved jobs yet"
		description="Save a shift from its detail page and it will wait for you here."
		actionLabel="Browse open shifts"
		actionHref={resolve('jobs')}
	/>
{/if}

<Pagination
	basePath={resolve('me/saved-jobs')}
	page={data.page}
	pageSize={data.pageSize}
	total={data.jobs.total}
	query={data.paginationQuery}
/>
