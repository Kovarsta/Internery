<script lang="ts">
	/**
	 * One record on `/me/work-records`.
	 *
	 * Shows the signed facts and whether the record is in the public directory,
	 * with the control that publishes or hides it. The write goes to
	 * `PATCH /me/work-records/{recordId}` and reloads the list, so the state comes
	 * from the server.
	 */

	import { refreshAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { apiSend } from '#lib/api/browser.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { showError, showSuccess } from '#lib/toast.ts';
	import type { WorkRecord } from '#lib/api/types.ts';
	import { formatDateRange, formatTimestamp } from '#lib/format.ts';

	let { record }: { record: WorkRecord } = $props();

	let isSaving = $state(false);

	const verifyHref = $derived(resolve(`work-records/${encodeURIComponent(record.id)}/verify`));
	const actionLabel = $derived(record.isPublic ? 'Make private' : 'Add to directory');

	async function setVisibility(isPublic: boolean) {
		isSaving = true;

		const result = await apiSend<WorkRecord>(`/api/v1/me/work-records/${record.id}`, 'PATCH', {
			isPublic
		});

		isSaving = false;

		if (!result.ok) {
			showError(result.message);
			return;
		}

		showSuccess(
			isPublic ? 'Record published to the directory.' : 'Record hidden from the directory.'
		);
		await refreshAll();
	}
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

		<Button
			class="mt-2"
			disabled={isSaving}
			onclick={() => setVisibility(!record.isPublic)}
			size="sm"
			type="button"
			variant="outline"
		>
			{isSaving ? 'Saving…' : actionLabel}
		</Button>
	</div>
</article>
