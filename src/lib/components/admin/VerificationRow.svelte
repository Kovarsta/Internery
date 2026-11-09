<script lang="ts">
	/**
	 * One request in the admin verification queue on `/admin/verification`.
	 *
	 * Approving marks the employer verified and confirms because the decision is
	 * final. Rejecting asks for a reason, because the employer receives it and
	 * may submit again, then confirms. Both writes report through a toast and
	 * reload the queue.
	 */

	import { refreshAll } from '$app/navigation';
	import { apiSend } from '#lib/api/browser.ts';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { formatTimestamp } from '#lib/format.ts';
	import { verificationRequestStatusClass, verificationRequestStatusLabel } from '#lib/labels.ts';
	import { showError, showSuccess } from '#lib/toast.ts';
	import type { VerificationRequest } from '#lib/api/types.ts';

	let { request }: { request: VerificationRequest } = $props();

	let isRejectFormOpen = $state(false);
	let isConfirmingApprove = $state(false);
	let isConfirmingReject = $state(false);
	let isSaving = $state(false);
	let reason = $state('');

	const isPending = $derived(request.status === 'PENDING');

	async function approve() {
		isSaving = true;

		const result = await apiSend<VerificationRequest>(
			`/api/v1/admin/verification-requests/${request.id}/approve`,
			'POST'
		);

		isSaving = false;

		if (!result.ok) {
			showError(result.message);
			return;
		}

		showSuccess(`${request.orgName} is verified.`);
		await refreshAll();
	}

	/** Checks the required reason before the confirmation dialog opens. */
	function askReject() {
		if (reason.trim() === '') {
			showError('Give the employer a reason for the rejection.');
			return;
		}

		isConfirmingReject = true;
	}

	async function reject() {
		isSaving = true;

		const result = await apiSend<VerificationRequest>(
			`/api/v1/admin/verification-requests/${request.id}/reject`,
			'POST',
			{ reason: reason.trim() }
		);

		isSaving = false;

		if (!result.ok) {
			showError(result.message);
			return;
		}

		isRejectFormOpen = false;
		reason = '';
		showSuccess('Request rejected and the employer notified.');
		await refreshAll();
	}
</script>

<article class="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-start">
	<div>
		<div class="flex flex-wrap items-center gap-2">
			<h2 class="text-lg leading-snug font-semibold">{request.orgName}</h2>
			<Badge class={verificationRequestStatusClass[request.status]} variant="ghost">
				{verificationRequestStatusLabel[request.status]}
			</Badge>
			{#if request.hasLicense}
				<Badge class="bg-muted text-muted-foreground" variant="ghost">Licence attached</Badge>
			{/if}
		</div>

		<p class="mt-1 text-sm text-ink/70">{request.contactInfo}</p>

		{#if request.websiteUrl}
			<p class="text-sm font-medium break-all text-chalk">{request.websiteUrl}</p>
		{/if}

		<p class="text-sm text-ink/60">Submitted {formatTimestamp(request.createdAt)}</p>

		{#if request.reviewedAt}
			<p class="text-sm text-ink/60">Reviewed {formatTimestamp(request.reviewedAt)}</p>
		{/if}

		{#if request.rejectReason}
			<p class="mt-2 border-l-2 border-warning/40 pl-3 text-sm text-ink/80">
				{request.rejectReason}
			</p>
		{/if}
	</div>

	{#if isPending}
		<div class="flex flex-wrap gap-2 sm:justify-end">
			<Button
				disabled={isSaving}
				onclick={() => (isConfirmingApprove = true)}
				size="sm"
				type="button"
			>
				{isSaving ? 'Saving…' : 'Approve'}
			</Button>
			<Button
				disabled={isSaving}
				onclick={() => (isRejectFormOpen = !isRejectFormOpen)}
				size="sm"
				type="button"
				variant="outline"
			>
				{isRejectFormOpen ? 'Cancel reject' : 'Reject'}
			</Button>
		</div>
	{/if}
</article>

{#if isRejectFormOpen && isPending}
	<div class="mb-5 border border-rule bg-card p-4">
		<Label class="mb-1" for="reject-reason-{request.id}">Reason sent to the employer</Label>
		<Input
			bind:value={reason}
			id="reject-reason-{request.id}"
			maxlength={500}
			placeholder="What is missing or unreadable?"
		/>

		<div class="mt-3">
			<Button disabled={isSaving} onclick={askReject} size="sm" type="button" variant="destructive">
				{isSaving ? 'Rejecting…' : 'Reject request'}
			</Button>
		</div>
	</div>
{/if}

<ConfirmDialog
	bind:open={isConfirmingApprove}
	confirmLabel="Approve"
	description={`${request.orgName} becomes verified on the marketplace and gains the verified badge. This decision is final for this request.`}
	onconfirm={approve}
	title="Approve this employer?"
/>

<ConfirmDialog
	bind:open={isConfirmingReject}
	confirmLabel="Reject request"
	description="The employer is told why and may submit a new request. This decision is final for the current request."
	destructive
	onconfirm={reject}
	title="Reject this request?"
/>
