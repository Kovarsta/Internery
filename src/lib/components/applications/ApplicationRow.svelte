<script lang="ts">
	/**
	 * One application row for `/me/applications`.
	 *
	 * A pending application can be withdrawn here. The write goes to the API and a
	 * toast reports the result; `refreshAll` reloads the list from the server.
	 */

	import { refreshAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { showError, showSuccess } from '#lib/toast.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { apiSend } from '#lib/api/browser.ts';
	import { formatTimestamp } from '#lib/format.ts';
	import { applicationStatusClass, applicationStatusLabel } from '#lib/labels.ts';
	import type { Application } from '#lib/api/types.ts';

	let { application }: { application: Application } = $props();

	let isWithdrawing = $state(false);

	async function withdraw() {
		isWithdrawing = true;

		const result = await apiSend(`/api/v1/applications/${application.id}/withdraw`, 'POST');

		isWithdrawing = false;

		if (!result.ok) {
			showError(result.message);
			return;
		}

		showSuccess('Application withdrawn.');
		await refreshAll();
	}
</script>

<article class="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-start">
	<div>
		<div class="flex flex-wrap items-center gap-2">
			<a
				class="text-lg font-semibold hover:text-chalk"
				href={resolve(`jobs/${encodeURIComponent(application.jobId)}`)}
			>
				{application.jobTitle}
			</a>
			<Badge class={applicationStatusClass[application.status]} variant="ghost">
				{applicationStatusLabel[application.status]}
			</Badge>
		</div>

		<p class="mt-1 text-sm text-ink/70">{application.employerName}</p>
		<p class="text-sm text-ink/60">Applied {formatTimestamp(application.createdAt)}</p>

		{#if application.message}
			<p class="mt-2 text-sm text-ink/70">“{application.message}”</p>
		{/if}

		{#if application.rejectReason}
			<p class="mt-2 text-sm text-warning">Reason: {application.rejectReason}</p>
		{/if}
	</div>

	{#if application.status === 'PENDING'}
		<Button disabled={isWithdrawing} onclick={withdraw} size="sm" type="button" variant="outline">
			{isWithdrawing ? 'Withdrawing…' : 'Withdraw'}
		</Button>
	{/if}
</article>
