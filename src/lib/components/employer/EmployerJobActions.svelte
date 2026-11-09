<script lang="ts">
	/**
	 * Lifecycle actions for one employer job on `/employer/jobs/[jobId]`.
	 *
	 * One toolbar keeps the safe actions on the left and the destructive actions on the right.
	 * Every button uses the neutral outline shape; dangerous labels are red. Each write opens the
	 * shared confirmation dialog first because it notifies students, ends the job, or removes
	 * applications.
	 */

	import { refreshAll } from '$app/navigation';
	import { apiSend } from '#lib/api/browser.ts';
	import { showError, showSuccess } from '#lib/toast.ts';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import type { JobStatus } from '#lib/api/types.ts';

	type JobAction = 'close' | 'complete' | 'cancel' | 'delete';

	type JobForActions = {
		id: string;
		status: JobStatus;
		acceptedCount: number;
	};

	let { job, publicHref }: { job: JobForActions; publicHref: string } = $props();

	let pendingAction = $state<JobAction | null>(null);
	let confirmAction = $state<JobAction | null>(null);
	let isConfirming = $state(false);

	const canClose = $derived(job.status === 'HIRING');
	const canCancel = $derived(
		job.status === 'HIRING' || job.status === 'CLOSED' || job.status === 'FILLED'
	);
	const canComplete = $derived(job.status === 'FILLED' || job.status === 'CLOSED');
	const canDelete = $derived(job.status !== 'COMPLETED' && job.acceptedCount === 0);

	const confirmContent = $derived.by(() => {
		if (confirmAction === 'close') {
			return {
				title: 'Close applications?',
				description:
					'The job leaves search and pending applicants are told it is no longer accepting applications. Accepted applicants are not affected. You can mark it completed later.',
				confirmLabel: 'Close applications',
				destructive: false
			};
		}

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
		if (confirmAction === 'close') {
			await run('close', 'Applications closed. The job left search.');
		}

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

<div class="flex flex-wrap items-center gap-2">
	{#if canClose}
		<Button
			disabled={pendingAction !== null}
			onclick={() => ask('close')}
			size="sm"
			variant="outline"
		>
			Close applications
		</Button>
	{/if}

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

	<Button href={publicHref} size="sm" variant="outline">View public listing</Button>

	{#if canCancel || canDelete}
		<div class="ml-auto flex flex-wrap items-center gap-2">
			{#if canCancel}
				<Button
					class="text-warning hover:text-warning"
					disabled={pendingAction !== null}
					onclick={() => ask('cancel')}
					size="sm"
					variant="outline"
				>
					Cancel job
				</Button>
			{/if}

			{#if canDelete}
				<Button
					class="text-warning hover:text-warning"
					disabled={pendingAction !== null}
					onclick={() => ask('delete')}
					size="sm"
					variant="outline"
				>
					Delete
				</Button>
			{/if}
		</div>
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
