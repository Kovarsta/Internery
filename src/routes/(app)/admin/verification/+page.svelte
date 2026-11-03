<script lang="ts">
	/**
	 * Admin verification queue (`/admin/verification`).
	 *
	 * Lists `GET /admin/verification-requests`, pending first by default. An
	 * approval marks the employer verified; a rejection stores a reason and lets
	 * the employer submit again.
	 */

	import { resolve } from '$app/paths';
	import EmptyState from '#lib/components/jobs/EmptyState.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Pagination from '#lib/components/jobs/Pagination.svelte';
	import VerificationRow from '#lib/components/admin/VerificationRow.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const filters = [
		{ label: 'Pending', value: 'PENDING' },
		{ label: 'Approved', value: 'APPROVED' },
		{ label: 'Rejected', value: 'REJECTED' },
		{ label: 'All', value: 'ALL' }
	];

	const total = $derived(data.requests.total);
</script>

<PageHeader
	title="Verification"
	description="Employers ask for the Verified badge. Approving marks their profile verified; rejecting stores a reason and lets them try again."
/>

<nav class="flex flex-wrap gap-2" aria-label="Filter by status">
	{#each filters as filter (filter.value)}
		<Button
			href={`?status=${filter.value}`}
			size="sm"
			variant={data.status === filter.value ? 'default' : 'outline'}
		>
			{filter.label}
		</Button>
	{/each}
</nav>

<p class="mt-4 text-sm text-ink/70">
	{total}
	{total === 1 ? 'request' : 'requests'}
	{data.status === 'PENDING' ? 'waiting for a decision' : 'in this view'}.
</p>

{#if data.requests.items.length > 0}
	<div class="mt-2 divide-y divide-rule border-t border-rule">
		{#each data.requests.items as request (request.id)}
			<VerificationRow {request} />
		{/each}
	</div>

	<Pagination
		basePath={resolve('admin/verification')}
		page={data.requests.page}
		pageSize={data.requests.pageSize}
		query={data.filterQuery}
		total={data.requests.total}
	/>
{:else}
	<EmptyState
		title="No requests here"
		description="Nothing matches this filter. Pending requests appear as soon as an employer asks."
		actionLabel="Back to pending"
		actionHref={resolve('admin/verification')}
	/>
{/if}
