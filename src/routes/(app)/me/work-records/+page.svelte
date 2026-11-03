<script lang="ts">
	/**
	 * My work records (`/me/work-records`).
	 *
	 * Lists `GET /me/work-records`, newest first, with the publish state of each signed record.
	 * Public records link to their verify page; this file composes the header, rows and pagination.
	 */

	import { resolve } from '$app/paths';
	import EmptyState from '#lib/components/jobs/EmptyState.svelte';
	import Pagination from '#lib/components/jobs/Pagination.svelte';
	import MyRecordRow from '#lib/components/work-records/MyRecordRow.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const total = $derived(data.records.total);
</script>

<h1 class="text-3xl font-extrabold tracking-tight">My work records</h1>
<p class="mt-2 max-w-2xl text-ink/70">
	{total}
	{total === 1 ? 'signed record' : 'signed records'}. An employer issues one when they review you
	after a completed job. Private records stay out of the public directory.
</p>

{#if data.records.items.length > 0}
	<div class="mt-6 divide-y divide-rule border-t border-rule">
		{#each data.records.items as record (record.id)}
			<MyRecordRow {record} />
		{/each}
	</div>
{:else}
	<EmptyState
		title="No work records yet"
		description="Finish a job and ask the employer for a review. The signed record appears here as soon as it is issued."
		actionLabel="Browse open shifts"
		actionHref={resolve('jobs')}
	/>
{/if}

<Pagination
	basePath={resolve('me/work-records')}
	page={data.page}
	pageSize={data.pageSize}
	total={data.records.total}
	query={data.paginationQuery}
/>
