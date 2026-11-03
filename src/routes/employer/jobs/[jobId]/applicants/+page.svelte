<script lang="ts">
	/**
	 * Applicants (`/employer/jobs/[jobId]/applicants`).
	 *
	 * Lists `GET /jobs/{jobId}/applications` for one of the employer's jobs, with a
	 * status filter kept in the URL. Each row owns accept and reject; this file
	 * composes the header, filters and list.
	 */

	import { resolve } from '$app/paths';
	import ApplicantRow from '#lib/components/employer/ApplicantRow.svelte';
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

	const basePath = $derived(resolve('/employer/jobs/[jobId]/applicants', { jobId: data.job.id }));
	const total = $derived(data.applicants.total);
</script>

<div class="flex flex-wrap items-start justify-between gap-3">
	<div>
		<p class="text-sm tracking-wide text-ink/60 uppercase">Applicants</p>
		<h1 class="text-3xl font-extrabold tracking-tight">{data.job.title}</h1>
		<p class="mt-2 text-ink/70">
			{total}
			{total === 1 ? 'applicant' : 'applicants'}
			{data.status ? 'with this status' : 'in total'}.
		</p>
	</div>

	<Button href={resolve('/employer/jobs')} size="sm" variant="outline">Back to my jobs</Button>
</div>

<nav class="mt-6 flex flex-wrap gap-2" aria-label="Filter by status">
	{#each statusFilters as filter (filter.label)}
		<Button
			href={filter.value ? `${basePath}?status=${filter.value}` : basePath}
			size="sm"
			variant={data.status === filter.value ? 'default' : 'outline'}
		>
			{filter.label}
		</Button>
	{/each}
</nav>

{#if data.applicants.items.length > 0}
	<div class="mt-6 divide-y divide-rule border-t border-rule">
		{#each data.applicants.items as applicant (applicant.id)}
			<ApplicantRow {applicant} />
		{/each}
	</div>
{:else}
	<EmptyState
		title="No applicants here"
		description="Students who apply to this job appear here, newest first."
		actionLabel="Back to my jobs"
		actionHref={resolve('/employer/jobs')}
	/>
{/if}
