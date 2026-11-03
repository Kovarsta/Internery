<script lang="ts">
	/**
	 * Remove action for `/me/saved-jobs`.
	 *
	 * Deletes the bookmark through the API and reports through a toast; `refreshAll` reloads the
	 * list so the row disappears from server data.
	 */

	import { refreshAll } from '$app/navigation';
	import { apiSend } from '#lib/api/browser.ts';
	import { showError, showSuccess } from '#lib/toast.ts';
	import { Button } from '#lib/components/ui/button/index.ts';

	let { jobId }: { jobId: string } = $props();

	let isRemoving = $state(false);

	async function remove() {
		isRemoving = true;

		const result = await apiSend(`/api/v1/me/saved-jobs/${jobId}`, 'DELETE');

		isRemoving = false;

		if (!result.ok) {
			showError(result.message);
			return;
		}

		showSuccess('Removed from saved jobs.');
		await refreshAll();
	}
</script>

<Button class="mt-2 text-warning" disabled={isRemoving} onclick={remove} size="sm" variant="ghost">
	{isRemoving ? 'Removing…' : 'Remove'}
</Button>
