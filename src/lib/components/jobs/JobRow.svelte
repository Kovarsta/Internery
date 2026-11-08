<script lang="ts">
	/**
	 * One job row for `/jobs`.
	 *
	 * Time comes first: the date range, the weekly schedule and remaining positions sit in their
	 * own column, so a student scans by when the work happens before reading the title.
	 */

	import { resolve } from '$app/paths';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import type { JobSummary } from '#lib/api/types.ts';
	import {
		formatDateRange,
		formatPositionsRemaining,
		formatRelativeTime,
		formatSalary
	} from '#lib/format.ts';
	import type { Snippet } from 'svelte';

	let { job, children }: { job: JobSummary; children?: Snippet } = $props();

	const href = $derived(resolve(`jobs/${encodeURIComponent(job.id)}`));
	const postedLabel = $derived(formatRelativeTime(job.createdAt));

	const ratingLabel = $derived.by(() => {
		if (job.employer.ratingCount === 0) {
			return null;
		}

		const reviews = job.employer.ratingCount === 1 ? 'review' : 'reviews';

		return `${job.employer.ratingAvg.toFixed(1)}/5 · ${job.employer.ratingCount} ${reviews}`;
	});
</script>

<article class="grid gap-4 py-5 sm:grid-cols-[11rem_1fr_auto] sm:items-start">
	<div class="text-sm">
		<p class="font-medium">{formatDateRange(job.startDate, job.endDate)}</p>
		<p class="mt-1 text-ink/70">{job.schedule}</p>
		<p class="mt-1 text-ink/60">{formatPositionsRemaining(job.positionsRemaining)}</p>
	</div>

	<div>
		<h3 class="text-lg leading-snug font-semibold">
			<a class="hover:text-chalk" {href}>{job.title}</a>
		</h3>
		<p class="mt-1 text-sm text-ink/70">
			{job.employer.orgName}
			{#if ratingLabel}
				<span class="ml-2 text-ink/60">{ratingLabel}</span>
			{/if}
			{#if job.employer.verified}
				<Badge class="ml-2 bg-chalk/10 text-chalk" variant="ghost">Verified</Badge>
			{/if}
			{#if job.scamWarning}
				<Badge class="ml-2 bg-warning/10 text-warning" variant="ghost">Check listing</Badge>
			{/if}
		</p>
		<p class="mt-1 text-sm text-ink/60">{job.category.name}</p>
		<p class="text-sm text-ink/60">{job.location} · Posted {postedLabel.toLowerCase()}</p>
	</div>

	<div class="sm:text-right">
		<p class="font-semibold">{formatSalary(job.salaryAmount, job.salaryType)}</p>
		<a class="mt-1 inline-block text-sm font-medium text-chalk hover:underline" {href}>
			View shift
		</a>
		{@render children?.()}
	</div>
</article>
