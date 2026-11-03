<script lang="ts">
	/**
	 * My jobs (`/employer/jobs`).
	 *
	 * Lists `GET /me/jobs` with a status filter kept in the URL. The create form
	 * redirects here with `?created=1`, which shows a single confirmation.
	 */

	import { resolve } from '$app/paths';
	import EmployerJobRow from '#lib/components/employer/EmployerJobRow.svelte';
	import EmptyState from '#lib/components/jobs/EmptyState.svelte';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import type { JobStatus } from '#lib/api/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const statusFilters: { label: string; value: JobStatus | null }[] = [
		{ label: 'All', value: null },
		{ label: 'Hiring', value: 'HIRING' },
		{ label: 'Filled', value: 'FILLED' },
		{ label: 'Completed', value: 'COMPLETED' },
		{ label: 'Cancelled', value: 'CANCELLED' }
	];

	const total = $derived(data.jobs.total);
</script>

<div class="flex flex-wrap items-start justify-between gap-3">
	<div>
		<h1 class="text-3xl font-extrabold tracking-tight">My jobs</h1>
		<p class="mt-2 text-ink/70">
			{total}
			{total === 1 ? 'job' : 'jobs'}
			{data.status ? 'with this status' : 'in total'}.
		</p>
	</div>

	<Button href={resolve('/employer/jobs/new')}>Post a job</Button>
</div>

{#if data.created}
	<Alert class="mt-6 border-chalk/30 bg-chalk/5">
		<AlertTitle>Job published</AlertTitle>
		<AlertDescription>It is in search now and students can apply.</AlertDescription>
	</Alert>
{/if}

<nav class="mt-6 flex flex-wrap gap-2" aria-label="Filter by status">
	{#each statusFilters as filter (filter.label)}
		<Button
			href={filter.value ? `?status=${filter.value}` : resolve('/employer/jobs')}
			size="sm"
			variant={data.status === filter.value ? 'default' : 'outline'}
		>
			{filter.label}
		</Button>
	{/each}
</nav>

{#if data.jobs.items.length > 0}
	<div class="mt-6 divide-y divide-rule border-t border-rule">
		{#each data.jobs.items as job (job.id)}
			<EmployerJobRow {job} />
		{/each}
	</div>
{:else}
	<EmptyState
		title="No jobs here"
		description="Post a shift and it appears in search immediately."
		actionLabel="Post a job"
		actionHref={resolve('/employer/jobs/new')}
	/>
{/if}
