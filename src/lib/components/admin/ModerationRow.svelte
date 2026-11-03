<script lang="ts">
	/**
	 * One job in the admin moderation queue on `/admin/moderation`.
	 *
	 * Hiding asks for a reason, because the employer receives it. Restoring and
	 * clearing the scam flag are direct actions. Every write reports through a
	 * toast and reloads the queue, so the row state comes from the server.
	 */

	import { refreshAll } from '$app/navigation';
	import { apiSend } from '#lib/api/browser.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { formatDateRange, formatSalary } from '#lib/format.ts';
	import {
		jobStatusClass,
		jobStatusLabel,
		moderationCauseClass,
		moderationCauseLabel
	} from '#lib/labels.ts';
	import { showError, showSuccess } from '#lib/toast.ts';
	import type { ModerationItem } from '#lib/api/types.ts';

	let { item }: { item: ModerationItem } = $props();

	let isHideFormOpen = $state(false);
	let isSaving = $state(false);
	let reason = $state('');

	const job = $derived(item.job);
	const hasScamFlag = $derived(item.causes.includes('SCAM_FLAG'));

	async function hide() {
		if (reason.trim() === '') {
			showError('Give the employer a reason for hiding the job.');
			return;
		}

		isSaving = true;

		const result = await apiSend(`/api/v1/admin/jobs/${job.id}/hide`, 'POST', {
			reason: reason.trim()
		});

		isSaving = false;

		if (!result.ok) {
			showError(result.message);
			return;
		}

		isHideFormOpen = false;
		reason = '';
		showSuccess('Job hidden and the employer notified.');
		await refreshAll();
	}

	async function runAction(action: 'restore' | 'clear-flag') {
		isSaving = true;

		const result = await apiSend(`/api/v1/admin/jobs/${job.id}/${action}`, 'POST');

		isSaving = false;

		if (!result.ok) {
			showError(result.message);
			return;
		}

		showSuccess(
			action === 'restore' ? 'Job restored.' : 'Scam warning cleared and reports resolved.'
		);
		await refreshAll();
	}
</script>

<article class="grid gap-3 py-5 sm:grid-cols-[11rem_1fr_auto] sm:items-start">
	<div class="text-sm">
		<p class="font-medium">{formatDateRange(job.startDate, job.endDate)}</p>
		<p class="mt-1 text-ink/60">{formatSalary(job.salaryAmount, job.salaryType)}</p>
		<p class="mt-1 text-ink/60">{item.openReportCount} open reports</p>
	</div>

	<div>
		<div class="flex flex-wrap items-center gap-2">
			<h2 class="text-lg leading-snug font-semibold">{job.title}</h2>
			<Badge class={jobStatusClass[job.status]} variant="ghost">
				{jobStatusLabel[job.status]}
			</Badge>
			{#if item.isHidden}
				<Badge class="bg-warning/10 text-warning" variant="ghost">Hidden</Badge>
			{/if}
		</div>

		<p class="mt-1 text-sm text-ink/70">
			{job.employer.orgName} · {job.location} · {job.category.name}
		</p>

		<div class="mt-2 flex flex-wrap gap-1">
			{#each item.causes as cause (cause)}
				<Badge class={moderationCauseClass[cause]} variant="ghost">
					{moderationCauseLabel[cause]}
				</Badge>
			{/each}
		</div>

		{#if item.hiddenReason}
			<p class="mt-2 border-l-2 border-warning/40 pl-3 text-sm text-ink/80">
				{item.hiddenReason}
			</p>
		{/if}

		{#if item.flaggedTerms.length > 0}
			<p class="mt-2 text-sm text-ink/70">
				Flagged words: {item.flaggedTerms.join(', ')}
			</p>
		{/if}
	</div>

	<div class="flex flex-wrap gap-2 sm:justify-end">
		{#if item.isHidden}
			<Button
				disabled={isSaving}
				onclick={() => runAction('restore')}
				size="sm"
				type="button"
				variant="outline"
			>
				Restore
			</Button>
		{:else}
			<Button
				disabled={isSaving}
				onclick={() => (isHideFormOpen = !isHideFormOpen)}
				size="sm"
				type="button"
				variant="destructive"
			>
				{isHideFormOpen ? 'Cancel hide' : 'Hide'}
			</Button>
		{/if}

		{#if hasScamFlag}
			<Button
				disabled={isSaving}
				onclick={() => runAction('clear-flag')}
				size="sm"
				type="button"
				variant="outline"
			>
				Clear flag
			</Button>
		{/if}
	</div>
</article>

{#if isHideFormOpen && !item.isHidden}
	<div class="mb-5 border border-rule bg-card p-4">
		<Label class="mb-1" for="hide-reason-{job.id}">Reason sent to the employer</Label>
		<Input
			bind:value={reason}
			id="hide-reason-{job.id}"
			maxlength={500}
			placeholder="What is wrong with this job?"
		/>

		<div class="mt-3">
			<Button disabled={isSaving} onclick={hide} size="sm" type="button" variant="destructive">
				{isSaving ? 'Hiding…' : 'Hide job'}
			</Button>
		</div>
	</div>
{/if}
