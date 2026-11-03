<script lang="ts">
	/**
	 * My applications (`/me/applications`).
	 *
	 * Lists `GET /me/applications`, with a status filter kept in the URL. Each row
	 * owns its withdraw action; this file composes the header, filters and list.
	 */

	import { resolve } from '$app/paths';
	import ApplicationRow from '#lib/components/applications/ApplicationRow.svelte';
	import EmptyState from '#lib/components/jobs/EmptyState.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import type { ApplicationStatus } from '#lib/api/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const statusFilters: { label: string; value: ApplicationStatus | null }[] = [
		{ label: 'All', value: null },
		{ label: 'Pending', value: 'PENDING' },
		{ label: 'Accepted', value: 'ACCEPTED' },
		{ label: 'Rejected', value: 'REJECTED' },
		{ label: 'Withdrawn', value: 'WITHDRAWN' }
	];

	const total = $derived(data.applications.total);
</script>

<h1 class="text-3xl font-extrabold tracking-tight">My applications</h1>
<p class="mt-2 text-ink/70">
	{total}
	{total === 1 ? 'application' : 'applications'}
	{data.status ? 'with this status' : 'in total'}.
</p>

<nav class="mt-6 flex flex-wrap gap-2" aria-label="Filter by status">
	{#each statusFilters as filter (filter.label)}
		<Button
			href={filter.value ? `?status=${filter.value}` : resolve('/me/applications')}
			size="sm"
			variant={data.status === filter.value ? 'default' : 'outline'}
		>
			{filter.label}
		</Button>
	{/each}
</nav>

{#if data.applications.items.length > 0}
	<div class="mt-6 divide-y divide-rule border-t border-rule">
		{#each data.applications.items as application (application.id)}
			<ApplicationRow {application} />
		{/each}
	</div>
{:else}
	<EmptyState
		title="No applications here"
		description="Applications you submit appear here with their current status."
		actionLabel="Browse open shifts"
		actionHref={resolve('/jobs')}
	/>
{/if}
