<script lang="ts">
	/**
	 * Add-category form on `/admin/categories`.
	 *
	 * The form writes from the browser so the result is a toast, then reloads
	 * the list. A duplicate name comes back as `409 NAME_TAKEN` and is shown as
	 * a toast without navigating away.
	 */

	import { refreshAll } from '$app/navigation';
	import { apiSend } from '#lib/api/browser.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { showError, showSuccess } from '#lib/toast.ts';
	import type { Category } from '#lib/api/types.ts';

	let name = $state('');
	let isSaving = $state(false);

	async function create(event: SubmitEvent) {
		event.preventDefault();

		if (name.trim() === '') {
			return;
		}

		isSaving = true;

		const result = await apiSend<Category>('/api/v1/admin/categories', 'POST', {
			name: name.trim()
		});

		isSaving = false;

		if (!result.ok) {
			showError(result.message);
			return;
		}

		name = '';
		showSuccess('Category added.');
		await refreshAll();
	}
</script>

<form class="flex flex-wrap items-end gap-2 border border-rule bg-card p-4" onsubmit={create}>
	<div class="min-w-56 flex-1">
		<Label class="mb-1" for="new-category-name">New category</Label>
		<Input
			bind:value={name}
			id="new-category-name"
			maxlength={100}
			placeholder="For example, Hospitality"
		/>
	</div>

	<Button disabled={isSaving || name.trim() === ''} size="sm" type="submit">
		{isSaving ? 'Adding…' : 'Add category'}
	</Button>
</form>
