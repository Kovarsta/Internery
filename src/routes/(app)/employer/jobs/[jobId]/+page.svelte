<script lang="ts">
	/**
	 * One employer job (`/employer/jobs/[jobId]`).
	 *
	 * The overview is the job workspace: facts, status actions and the detail
	 * content. Applicants and Edit are sibling tabs.
	 */

	import { resolve } from '$app/paths';
	import EmployerJobActions from '#lib/components/employer/EmployerJobActions.svelte';
	import EmployerJobTabs from '#lib/components/employer/EmployerJobTabs.svelte';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { formatDateRange, formatPositionsRemaining, formatSalary } from '#lib/format.ts';
	import { jobStatusClass, jobStatusLabel } from '#lib/labels.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const job = $derived(data.job);
	const acceptedCount = $derived(Math.max(job.positionsNeeded - job.positionsRemaining, 0));
	const publicHref = $derived(resolve(`jobs/${encodeURIComponent(job.id)}`));
</script>

<p class="text-sm tracking-wide text-ink/60 uppercase">Job</p>
<div class="mt-1 flex flex-wrap items-center gap-2">
	<h1 class="text-3xl font-extrabold tracking-tight">{job.title}</h1>
	<Badge class={jobStatusClass[job.status]} variant="ghost">{jobStatusLabel[job.status]}</Badge>
</div>
<p class="mt-2 text-ink/70">{job.category.name} · {job.location}</p>
<p class="text-sm text-ink/60">
	{formatDateRange(job.startDate, job.endDate)} · {formatSalary(job.salaryAmount, job.salaryType)}
</p>
<p class="mt-2 text-sm text-ink/70">
	{data.applicantCount}
	{data.applicantCount === 1 ? 'applicant' : 'applicants'}
	· {acceptedCount} accepted · {formatPositionsRemaining(job.positionsRemaining)}
</p>

<div class="mt-6">
	<EmployerJobTabs canEdit={job.status === 'HIRING'} jobId={job.id} />
</div>

<div class="mb-8">
	<EmployerJobActions job={{ id: job.id, status: job.status, acceptedCount }} {publicHref} />
</div>

<section class="max-w-3xl space-y-6">
	<div>
		<h2 class="text-sm font-semibold">Description</h2>
		<p class="mt-2 whitespace-pre-line text-ink/80">{job.description}</p>
	</div>

	<dl class="grid gap-5 border-t border-rule pt-5 sm:grid-cols-2">
		<div>
			<dt class="text-sm text-ink/60">Schedule</dt>
			<dd class="mt-1 font-medium">{job.schedule}</dd>
			{#if job.scheduleNote}
				<p class="mt-1 text-sm text-ink/60">{job.scheduleNote}</p>
			{/if}
		</div>
		<div>
			<dt class="text-sm text-ink/60">Location</dt>
			<dd class="mt-1 font-medium">{job.location}</dd>
		</div>
		<div>
			<dt class="text-sm text-ink/60">Pay</dt>
			<dd class="mt-1 font-medium">{formatSalary(job.salaryAmount, job.salaryType)}</dd>
		</div>
		<div>
			<dt class="text-sm text-ink/60">Positions</dt>
			<dd class="mt-1 font-medium">
				{job.positionsRemaining} of {job.positionsNeeded} still open
			</dd>
		</div>
	</dl>
</section>
