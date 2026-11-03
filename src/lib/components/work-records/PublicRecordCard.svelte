<script lang="ts">
	/**
	 * One card in the `/work-records` directory.
	 *
	 * Leads with the dates worked, matching the shift-first job row, then names the student, the job
	 * and the employer. The verify link opens the signature check for this record.
	 */

	import { resolve } from '$app/paths';
	import type { WorkRecordCard } from '#lib/api/types.ts';
	import { formatDateRange, formatTimestamp } from '#lib/format.ts';

	let { record }: { record: WorkRecordCard } = $props();

	const verifyHref = $derived(resolve(`work-records/${encodeURIComponent(record.id)}/verify`));
</script>

<article class="flex h-full flex-col border-t-4 border-chalk bg-card p-5">
	<p class="text-sm font-medium">{formatDateRange(record.startDate, record.endDate)}</p>

	<h2 class="mt-3 text-lg leading-snug font-semibold">{record.studentName}</h2>
	<p class="mt-1 text-sm text-ink/70">{record.jobTitle}</p>
	<p class="mt-1 text-sm text-ink/60">{record.employerName}</p>

	{#if record.comment}
		<p class="mt-3 border-l-2 border-rule pl-3 text-sm text-ink/80">{record.comment}</p>
	{/if}

	<div class="mt-auto flex items-end justify-between gap-3 pt-4">
		<div class="text-sm">
			<p class="font-semibold">{record.rating} / 5</p>
			<p class="text-ink/50">Issued {formatTimestamp(record.issuedAt)}</p>
		</div>
		<a class="font-medium text-chalk hover:underline" href={verifyHref}>Verify</a>
	</div>
</article>
