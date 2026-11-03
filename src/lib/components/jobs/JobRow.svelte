<script lang="ts">
	/**
	 * One job row for `/jobs`.
	 *
	 * Time comes first: the date range and remaining positions sit in their own column, so a
	 * student scans by when the work happens before reading the title.
	 */

	import { resolve } from '$app/paths';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import type { JobSummary } from '#lib/api/types.ts';
	import { formatDateRange, formatPositionsRemaining, formatSalary } from '#lib/format.ts';

	let { job }: { job: JobSummary } = $props();

	const href = $derived(resolve(`jobs/${encodeURIComponent(job.id)}`));
</script>

<article class="grid gap-4 py-5 sm:grid-cols-[11rem_1fr_auto] sm:items-start">
	<div class="text-sm">
		<p class="font-medium">{formatDateRange(job.startDate, job.endDate)}</p>
		<p class="mt-1 text-ink/60">{formatPositionsRemaining(job.positionsRemaining)}</p>
	</div>

	<div>
		<h3 class="text-lg leading-snug font-semibold">
			<a class="hover:text-chalk" {href}>{job.title}</a>
		</h3>
		<p class="mt-1 text-sm text-ink/70">
			{job.employer.orgName}
			{#if job.employer.verified}
				<Badge class="ml-2 bg-chalk/10 text-chalk" variant="ghost">Verified</Badge>
			{/if}
			{#if job.scamWarning}
				<Badge class="ml-2 bg-warning/10 text-warning" variant="ghost">Check listing</Badge>
			{/if}
		</p>
		<p class="mt-1 text-sm text-ink/60">{job.category.name}</p>
		<p class="text-sm text-ink/60">{job.location}</p>
	</div>

	<div class="sm:text-right">
		<p class="font-semibold">{formatSalary(job.salaryAmount, job.salaryType)}</p>
		<a class="mt-1 inline-block text-sm font-medium text-chalk hover:underline" {href}>
			View shift
		</a>
	</div>
</article>
