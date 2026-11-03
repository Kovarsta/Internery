<script lang="ts">
	/**
	 * One job row for `/employer/jobs`.
	 *
	 * Shows the counts the employer cares about and links to the public listing and
	 * the applicant list. A hidden job keeps its reason visible.
	 */

	import { resolve } from '$app/paths';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { formatDateRange, formatPositionsRemaining, formatSalary } from '#lib/format.ts';
	import { jobStatusClass, jobStatusLabel } from '#lib/labels.ts';
	import type { MyJob } from '#lib/api/types.ts';

	let { job }: { job: MyJob } = $props();
</script>

<article class="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-start">
	<div>
		<div class="flex flex-wrap items-center gap-2">
			<a
				class="text-lg font-semibold hover:text-chalk"
				href={resolve(`jobs/${encodeURIComponent(job.id)}`)}
			>
				{job.title}
			</a>
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

	<div class="flex flex-wrap gap-2 sm:justify-end">
		<Button
			href={resolve(`employer/jobs/${encodeURIComponent(job.id)}/applicants`)}
			size="sm"
			variant="outline"
		>
			Applicants
		</Button>
		<Button href={resolve(`jobs/${encodeURIComponent(job.id)}`)} size="sm" variant="ghost">
			View
		</Button>
	</div>
</article>
