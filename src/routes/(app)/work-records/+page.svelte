<script lang="ts">
	/**
	 * Work-record directory (`/work-records`).
	 *
	 * Lists `GET /work-records`, the records students chose to publish. Each card opens the public
	 * verify page; this file composes the header, cards and pagination.
	 */

	import { resolve } from '$app/paths';
	import EmptyState from '#lib/components/jobs/EmptyState.svelte';
	import Pagination from '#lib/components/jobs/Pagination.svelte';
	import PublicRecordCard from '#lib/components/work-records/PublicRecordCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const total = $derived(data.records.total);
</script>

<h1 class="text-3xl font-extrabold tracking-tight">Work records</h1>
<p class="mt-2 max-w-2xl text-ink/70">
	Signed records that employers issued after a completed job, published by the students who earned
	them. Every card can be checked against its signature.
</p>

<div class="mt-6 flex items-baseline justify-between border-b border-rule pb-2">
	<h2 class="text-base font-semibold">
		{total}
		{total === 1 ? 'public record' : 'public records'}
	</h2>
	<p class="text-sm text-ink/60">Newest first</p>
</div>

{#if data.records.items.length > 0}
	<div class="mt-5 grid gap-4 sm:grid-cols-2">
		{#each data.records.items as record (record.id)}
			<PublicRecordCard {record} />
		{/each}
	</div>
{:else}
	<EmptyState
		title="No public records yet"
		description="A record appears here after an employer reviews a student on a completed job and the student publishes it."
		actionLabel="Browse open shifts"
		actionHref={resolve('jobs')}
	/>
{/if}

<Pagination
	basePath={resolve('work-records')}
	page={data.page}
	pageSize={data.pageSize}
	total={data.records.total}
	query={data.paginationQuery}
/>
