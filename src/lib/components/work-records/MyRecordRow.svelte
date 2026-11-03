<script lang="ts">
	/**
	 * One record on `/me/work-records`.
	 *
	 * Shows the signed facts and whether the record is in the public directory. A public record links
	 * to its verify page; the publish toggle belongs to the work-record write API, which is not live.
	 */

	import { resolve } from '$app/paths';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import type { WorkRecord } from '#lib/api/types.ts';
	import { formatDateRange, formatTimestamp } from '#lib/format.ts';

	let { record }: { record: WorkRecord } = $props();

	const verifyHref = $derived(resolve(`work-records/${encodeURIComponent(record.id)}/verify`));
</script>

<article class="grid gap-3 py-5 sm:grid-cols-[11rem_1fr_auto] sm:items-start">
	<div class="text-sm">
		<p class="font-medium">{formatDateRange(record.startDate, record.endDate)}</p>
		<p class="mt-1 text-ink/60">Issued {formatTimestamp(record.issuedAt)}</p>
	</div>

	<div>
		<div class="flex flex-wrap items-center gap-2">
			<h2 class="text-lg leading-snug font-semibold">{record.jobTitle}</h2>
			<Badge
				class={record.isPublic ? 'bg-chalk/10 text-chalk' : 'bg-muted text-muted-foreground'}
				variant="ghost"
			>
				{record.isPublic ? 'Public' : 'Private'}
			</Badge>
		</div>

		<p class="mt-1 text-sm text-ink/70">{record.employerName}</p>

		{#if record.comment}
			<p class="mt-2 border-l-2 border-rule pl-3 text-sm text-ink/80">{record.comment}</p>
		{/if}
	</div>

	<div class="text-sm sm:text-right">
		<p class="font-semibold">{record.rating} / 5</p>
		{#if record.isPublic}
			<a class="mt-1 inline-block font-medium text-chalk hover:underline" href={verifyHref}>
				Public page
			</a>
		{:else}
			<p class="mt-1 text-ink/50">Only you can see this</p>
		{/if}
	</div>
</article>
