<script lang="ts">
	/**
	 * One job row for `/employer/jobs`.
	 *
	 * The row is a summary and one link to the job workspace; status actions live
	 * on the overview so the list stays scannable.
	 */

	import { resolve } from '$app/paths';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { formatDateRange, formatPositionsRemaining, formatSalary } from '#lib/format.ts';
	import { jobStatusClass, jobStatusLabel } from '#lib/labels.ts';
	import type { MyJob } from '#lib/api/types.ts';

	let { job }: { job: MyJob } = $props();

	const href = $derived(resolve(`employer/jobs/${encodeURIComponent(job.id)}`));
</script>

<a
	class="grid gap-3 py-5 transition-colors hover:bg-black/[0.02] sm:grid-cols-[1fr_auto] sm:items-center"
	{href}
>
	<div>
		<div class="flex flex-wrap items-center gap-2">
			<h3 class="text-lg font-semibold">{job.title}</h3>
			<Badge class={jobStatusClass[job.status]} variant="ghost">{jobStatusLabel[job.status]}</Badge>
			{#if job.isHidden}
				<Badge class="bg-warning/10 text-warning" variant="ghost">Hidden</Badge>
			{/if}
		</div>

		<p class="mt-1 text-sm text-ink/70">{job.category.name} · {job.location}</p>
		<p class="text-sm text-ink/60">
			{formatDateRange(job.startDate, job.endDate)} ·
			{formatSalary(job.salaryAmount, job.salaryType)}
		</p>
		<p class="mt-2 text-sm text-ink/70">
			{job.applicantCount}
			{job.applicantCount === 1 ? 'applicant' : 'applicants'}
			· {job.acceptedCount} accepted · {formatPositionsRemaining(job.positionsRemaining)}
		</p>

		{#if job.isHidden && job.hiddenReason}
			<p class="mt-1 text-sm text-warning">{job.hiddenReason}</p>
		{/if}
	</div>

	<span class="text-sm font-medium text-chalk">Manage</span>
</a>
