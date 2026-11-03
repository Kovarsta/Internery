<script lang="ts">
	/**
	 * One applicant row for `/employer/jobs/[jobId]/applicants`.
	 *
	 * A pending applicant can be accepted or rejected here. Both writes go to the
	 * API and report through a toast; `refreshAll` then reloads the list so the
	 * status comes from the server.
	 */

	import { refreshAll } from '$app/navigation';
	import { apiSend } from '#lib/api/browser.ts';
	import { showError, showSuccess } from '#lib/toast.ts';
	import { formatTimestamp } from '#lib/format.ts';
	import { applicationStatusClass, applicationStatusLabel } from '#lib/labels.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import type { Applicant, Application } from '#lib/api/types.ts';

	type Decision = 'accept' | 'reject';

	let { applicant }: { applicant: Applicant } = $props();

	let pendingDecision = $state<Decision | null>(null);

	const isBusy = $derived(pendingDecision !== null);
	const studies = $derived(
		[applicant.student.university, applicant.student.major].filter((part) => part).join(' · ')
	);
	const cvHref = $derived(`/api/v1/applications/${applicant.id}/cv`);

	async function decide(decision: Decision) {
		pendingDecision = decision;

		// The accept endpoint takes no body; reject accepts an optional reason.
		const body = decision === 'reject' ? { reason: null } : undefined;
		const result = await apiSend<{ application: Application; jobFilled: boolean }>(
			`/api/v1/applications/${applicant.id}/${decision}`,
			'POST',
			body
		);

		pendingDecision = null;

		if (!result.ok) {
			showError(result.message);
			return;
		}

		if (decision === 'accept') {
			showSuccess(
				result.data?.jobFilled ? 'Applicant accepted. The job is filled.' : 'Applicant accepted.'
			);
		} else {
			showSuccess('Applicant rejected.');
		}

		await refreshAll();
	}
</script>

<article class="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-start">
	<div>
		<div class="flex flex-wrap items-center gap-2">
			<h2 class="text-lg font-semibold">{applicant.student.fullName}</h2>
			<Badge class={applicationStatusClass[applicant.status]} variant="ghost">
				{applicationStatusLabel[applicant.status]}
			</Badge>
		</div>

		{#if studies}
			<p class="mt-1 text-sm text-ink/70">{studies}</p>
		{/if}

		{#if applicant.student.ratingCount > 0}
			<p class="text-sm text-ink/60">
				{applicant.student.ratingAvg.toFixed(1)} from {applicant.student.ratingCount}
				{applicant.student.ratingCount === 1 ? 'review' : 'reviews'}
			</p>
		{:else}
			<p class="text-sm text-ink/60">No reviews yet</p>
		{/if}

		<p class="text-sm text-ink/60">Applied {formatTimestamp(applicant.createdAt)}</p>

		{#if applicant.message}
			<p class="mt-2 text-sm text-ink/70">“{applicant.message}”</p>
		{/if}
	</div>

	<div class="flex flex-wrap gap-2 sm:justify-end">
		{#if applicant.status === 'PENDING'}
			<Button disabled={isBusy} onclick={() => decide('accept')} size="sm" type="button">
				{pendingDecision === 'accept' ? 'Accepting…' : 'Accept'}
			</Button>
			<Button
				disabled={isBusy}
				onclick={() => decide('reject')}
				size="sm"
				type="button"
				variant="outline"
			>
				{pendingDecision === 'reject' ? 'Rejecting…' : 'Reject'}
			</Button>
		{/if}

		{#if applicant.hasCv}
			<Button href={cvHref} size="sm" variant="ghost">Download CV</Button>
		{/if}
	</div>
</article>
