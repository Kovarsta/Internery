<script lang="ts">
	/**
	 * Report control for `/jobs/[jobId]`.
	 *
	 * Only students see it. A report goes to `POST /jobs/{jobId}/reports`; when it
	 * pushes the job over the auto-hide threshold the job leaves search, so the
	 * page reloads and may show the error page instead. The result arrives as a
	 * toast either way.
	 */

	import { refreshAll } from '$app/navigation';
	import { apiSend } from '#lib/api/browser.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { Textarea } from '#lib/components/ui/textarea/index.ts';
	import { showError, showSuccess } from '#lib/toast.ts';

	let { jobId }: { jobId: string } = $props();

	let isOpen = $state(false);
	let isSending = $state(false);
	let reason = $state('');

	const canSend = $derived(reason.trim() !== '' && !isSending);

	async function report(event: SubmitEvent) {
		event.preventDefault();

		if (!canSend) {
			return;
		}

		isSending = true;

		const result = await apiSend<{ autoHidden: boolean }>(`/api/v1/jobs/${jobId}/reports`, 'POST', {
			reason: reason.trim()
		});

		isSending = false;

		if (!result.ok) {
			showError(result.message);
			return;
		}

		isOpen = false;
		reason = '';
		showSuccess(
			result.data?.autoHidden
				? 'Report sent. The job is hidden until an admin reviews it.'
				: 'Report sent to the moderators.'
		);

		await refreshAll();
	}
</script>

<section class="mt-6 border-t border-rule pt-4">
	{#if isOpen}
		<form onsubmit={report}>
			<Label class="mb-1" for="report-reason">What looks wrong?</Label>
			<Textarea
				bind:value={reason}
				id="report-reason"
				maxlength={500}
				placeholder="For example: they asked for a deposit before the first shift."
				rows={3}
			/>
			<p class="mt-1 text-xs text-ink/60">{reason.length}/500</p>

			<div class="mt-3 flex gap-2">
				<Button disabled={!canSend} size="sm" type="submit" variant="destructive">
					{isSending ? 'Sending…' : 'Send report'}
				</Button>
				<Button
					disabled={isSending}
					onclick={() => (isOpen = false)}
					size="sm"
					type="button"
					variant="ghost"
				>
					Cancel
				</Button>
			</div>
		</form>
	{:else}
		<p class="text-sm text-ink/70">Something wrong with this shift?</p>
		<Button class="mt-2" onclick={() => (isOpen = true)} size="sm" type="button" variant="ghost">
			Report this job
		</Button>
	{/if}
</section>
