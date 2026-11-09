<script lang="ts">
	/**
	 * A job card for the home page.
	 *
	 * `hero` is the large card beside the pitch; `grid` is one of the smaller
	 * cards in the hot-shift row. The whole card is one link so the card scans
	 * like a listing, not a form.
	 */

	import { resolve } from '$app/paths';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import {
		formatDateRange,
		formatPositionsRemaining,
		formatRelativeTime,
		formatSalary
	} from '#lib/format.ts';
	import type { JobSummary } from '#lib/api/types.ts';

	type Props = {
		job: JobSummary;
		variant?: 'hero' | 'grid';
	};

	let { job, variant = 'grid' }: Props = $props();

	const NEW_JOB_WINDOW_MS = 24 * 60 * 60 * 1000;

	const href = $derived(resolve(`jobs/${encodeURIComponent(job.id)}`));
	const postedLabel = $derived(formatRelativeTime(job.createdAt));
	const badgeLabel = $derived.by(() => {
		if (variant === 'hero') {
			return 'Featured shift';
		}

		const age = Date.now() - new Date(job.createdAt).getTime();

		return age <= NEW_JOB_WINDOW_MS ? 'New' : 'Hot';
	});

	const ratingLabel = $derived.by(() => {
		if (job.employer.ratingCount === 0) {
			return null;
		}

		const reviews = job.employer.ratingCount === 1 ? 'review' : 'reviews';

		return `${job.employer.ratingAvg.toFixed(1)}/5 · ${job.employer.ratingCount} ${reviews}`;
	});

	const cardClass = $derived(
		variant === 'hero'
			? 'group flex h-full flex-col border border-rule border-t-4 border-t-chalk bg-card p-6 transition-colors hover:border-chalk sm:p-8'
			: 'group flex h-full flex-col border border-rule border-t-4 border-t-chalk bg-card p-5 transition-colors hover:border-chalk'
	);

	const titleClass = $derived(
		variant === 'hero' ? 'text-2xl font-bold tracking-tight sm:text-3xl' : 'text-xl font-semibold'
	);

	const payClass = $derived(
		variant === 'hero' ? 'text-3xl font-extrabold tracking-tight' : 'text-2xl font-bold'
	);
</script>

<a class={cardClass} {href}>
	<div class="flex flex-wrap items-center justify-between gap-2">
		<span class="text-xs font-semibold tracking-wide text-ink/50 uppercase">
			{job.category.name}
		</span>
		<Badge
			class={variant === 'hero' ? 'bg-chalk/10 text-chalk' : 'bg-highlight/20 text-ink'}
			variant="ghost"
		>
			{badgeLabel}
		</Badge>
	</div>

	<h3 class="mt-3 leading-snug group-hover:text-chalk {titleClass}">{job.title}</h3>

	<p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink/70">
		<span>{job.employer.orgName}</span>
		{#if ratingLabel}
			<span class="text-ink/60">{ratingLabel}</span>
		{/if}
		{#if job.employer.verified}
			<Badge class="bg-chalk/10 text-chalk" variant="ghost">Verified</Badge>
		{/if}
	</p>

	<div class="mt-5 flex flex-wrap items-end justify-between gap-3">
		<div>
			<p class={payClass}>{formatSalary(job.salaryAmount, job.salaryType)}</p>
			<p class="mt-1 text-sm text-ink/60">
				{job.location} · {formatPositionsRemaining(job.positionsRemaining)}
			</p>
		</div>
		<p class="text-sm text-ink/60">{job.schedule}</p>
	</div>

	<p class="mt-3 text-sm text-ink/60">
		{formatDateRange(job.startDate, job.endDate)} · Posted {postedLabel.toLowerCase()}
	</p>

	<span class="mt-4 text-sm font-medium text-chalk group-hover:underline">View shift</span>
</a>
