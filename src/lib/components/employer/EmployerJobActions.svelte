<script lang="ts">
	/**
	 * Status actions for one row on `/employer/jobs`.
	 *
	 * Completing, cancelling and deleting are browser writes that report through a toast. The
	 * cancel and delete flows confirm first because they notify students or remove applications.
	 */

	import { refreshAll } from '$app/navigation';
	import { apiSend } from '#lib/api/browser.ts';
	import { showError, showSuccess } from '#lib/toast.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import type { MyJob } from '#lib/api/types.ts';

	type JobAction = 'complete' | 'cancel' | 'delete';

	let { job }: { job: MyJob } = $props();

	let pendingAction = $state<JobAction | null>(null);

	const canCancel = $derived(job.status === 'HIRING' || job.status === 'FILLED');
	const canComplete = $derived(job.status === 'FILLED');
	const canDelete = $derived(job.status !== 'COMPLETED' && job.acceptedCount === 0);

	async function complete() {
		await run('complete', 'Job marked completed. Students can now leave reviews.');
	}

	async function cancel() {
		const confirmed = confirm(
			'Cancel this job? Pending and accepted students are notified and the job leaves search.'
		);

		if (!confirmed) {
			return;
		}

		await run('cancel', 'Job cancelled.');
	}

	async function remove() {
		const confirmed = confirm('Delete this job? Pending applications are removed with it.');

		if (!confirmed) {
			return;
		}

		await run('delete', 'Job deleted.');
	}

	/** Sends one status write and reloads the list when the API accepts it. */
	async function run(action: JobAction, successMessage: string) {
		pendingAction = action;

		const result =
			action === 'delete'
				? await apiSend(`/api/v1/jobs/${job.id}`, 'DELETE')
				: await apiSend(`/api/v1/jobs/${job.id}/${action}`, 'POST');

		pendingAction = null;

		if (!result.ok) {
			showError(result.message);
			return;
		}

		showSuccess(successMessage);
		await refreshAll();
	}
</script>

<div class="flex flex-wrap justify-end gap-2">
	{#if canComplete}
		<Button disabled={pendingAction !== null} onclick={complete} size="sm" variant="outline">
			{pendingAction === 'complete' ? 'Completing…' : 'Mark completed'}
		</Button>
	{/if}

	{#if canCancel}
		<Button
			class="text-warning"
			disabled={pendingAction !== null}
			onclick={cancel}
			size="sm"
			variant="ghost"
		>
			Cancel job
		</Button>
	{/if}

	{#if canDelete}
		<Button
			class="text-warning"
			disabled={pendingAction !== null}
			onclick={remove}
			size="sm"
			variant="ghost"
		>
			Delete
		</Button>
	{/if}
</div>
