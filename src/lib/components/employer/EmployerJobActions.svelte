<script lang="ts">
	/**
	 * Status actions for one row on `/employer/jobs`.
	 *
	 * Completing, cancelling and deleting are irreversible browser writes that report through a
	 * toast. Each one opens the shared confirmation dialog first because it notifies students, ends
	 * the job, or removes applications.
	 */

	import { refreshAll } from '$app/navigation';
	import { apiSend } from '#lib/api/browser.ts';
	import { showError, showSuccess } from '#lib/toast.ts';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import type { MyJob } from '#lib/api/types.ts';

	type JobAction = 'complete' | 'cancel' | 'delete';

	let { job }: { job: MyJob } = $props();

	let pendingAction = $state<JobAction | null>(null);
	let confirmAction = $state<JobAction | null>(null);
	let isConfirming = $state(false);

	const canCancel = $derived(job.status === 'HIRING' || job.status === 'FILLED');
	const canComplete = $derived(job.status === 'FILLED');
	const canDelete = $derived(job.status !== 'COMPLETED' && job.acceptedCount === 0);

	const confirmContent = $derived.by(() => {
		if (confirmAction === 'complete') {
			return {
				title: 'Mark this job completed?',
				description:
					'This is final. Students can then review the employer, and the job cannot return to hiring.',
				confirmLabel: 'Mark completed',
				destructive: false
			};
		}

		if (confirmAction === 'cancel') {
			return {
				title: 'Cancel this job?',
				description:
					'Pending and accepted students are notified and the job leaves search. This cannot be undone.',
				confirmLabel: 'Cancel job',
				destructive: true
			};
		}

		return {
			title: 'Delete this job?',
			description:
				'Pending applications and saved bookmarks are removed with it. This cannot be undone.',
			confirmLabel: 'Delete job',
			destructive: true
		};
	});

	function ask(action: JobAction) {
		confirmAction = action;
		isConfirming = true;
	}

	async function confirmDestructive() {
		if (confirmAction === 'complete') {
			await run('complete', 'Job marked completed. Students can now leave reviews.');
		}

		if (confirmAction === 'cancel') {
			await run('cancel', 'Job cancelled.');
		}

		if (confirmAction === 'delete') {
			await run('delete', 'Job deleted.');
		}

		confirmAction = null;
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
		<Button
			disabled={pendingAction !== null}
			onclick={() => ask('complete')}
			size="sm"
			variant="outline"
		>
			Mark completed
		</Button>
	{/if}

	{#if canCancel}
		<Button
			class="text-warning"
			disabled={pendingAction !== null}
			onclick={() => ask('cancel')}
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
			onclick={() => ask('delete')}
			size="sm"
			variant="ghost"
		>
			Delete
		</Button>
	{/if}
</div>

<ConfirmDialog
	bind:open={isConfirming}
	confirmLabel={confirmContent.confirmLabel}
	description={confirmContent.description}
	destructive={confirmContent.destructive}
	onconfirm={confirmDestructive}
	title={confirmContent.title}
/>
