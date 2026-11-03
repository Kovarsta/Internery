<script lang="ts">
	/**
	 * One category row on `/admin/categories`.
	 *
	 * A category used by a job cannot be deleted; the API answers `409
	 * CATEGORY_IN_USE`, so the row offers deactivation as the safe alternative.
	 * Deleting asks for a second click because it cannot be undone.
	 */

	import { refreshAll } from '$app/navigation';
	import { apiSend } from '#lib/api/browser.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { showError, showSuccess } from '#lib/toast.ts';
	import type { Category } from '#lib/api/types.ts';

	let { category }: { category: Category } = $props();

	// The prop seeds the draft. A successful save reloads the row, and the input
	// keeps the value the person typed until then.
	// svelte-ignore state_referenced_locally
	let name = $state(category.name);
	let isSaving = $state(false);
	let isConfirmingDelete = $state(false);

	const isRenamed = $derived(name.trim() !== category.name);

	async function run(
		method: 'PATCH' | 'DELETE',
		body: unknown,
		successMessage: string
	): Promise<boolean> {
		isSaving = true;

		const result = await apiSend<Category>(`/api/v1/admin/categories/${category.id}`, method, body);

		isSaving = false;

		if (!result.ok) {
			showError(result.message);
			return false;
		}

		showSuccess(successMessage);
		await refreshAll();
		return true;
	}

	async function rename(event: SubmitEvent) {
		event.preventDefault();

		if (!isRenamed || name.trim() === '') {
			return;
		}

		const renamed = await run('PATCH', { name: name.trim() }, 'Category renamed.');

		if (!renamed) {
			name = category.name;
		}
	}

	async function toggleActive() {
		await run(
			'PATCH',
			{ isActive: !category.isActive },
			category.isActive ? 'Category deactivated.' : 'Category reactivated.'
		);
	}

	async function remove() {
		const deleted = await run('DELETE', undefined, 'Category deleted.');

		if (!deleted) {
			isConfirmingDelete = false;
		}
	}
</script>

<article class="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
	<form class="flex flex-wrap items-end gap-2" onsubmit={rename}>
		<div class="min-w-56 flex-1">
			<Label class="sr-only" for="category-name-{category.id}">Category name</Label>
			<Input bind:value={name} id="category-name-{category.id}" maxlength={100} />
		</div>

		<Button disabled={isSaving || !isRenamed || name.trim() === ''} size="sm" type="submit">
			Save
		</Button>
	</form>

	<div class="flex flex-wrap items-center gap-2 sm:justify-end">
		<Badge
			class={category.isActive ? 'bg-chalk/10 text-chalk' : 'bg-muted text-muted-foreground'}
			variant="ghost"
		>
			{category.isActive ? 'Active' : 'Inactive'}
		</Badge>

		<Button disabled={isSaving} onclick={toggleActive} size="sm" type="button" variant="outline">
			{category.isActive ? 'Deactivate' : 'Activate'}
		</Button>

		{#if isConfirmingDelete}
			<Button disabled={isSaving} onclick={remove} size="sm" type="button" variant="destructive">
				{isSaving ? 'Deleting…' : 'Delete for good'}
			</Button>
			<Button
				disabled={isSaving}
				onclick={() => (isConfirmingDelete = false)}
				size="sm"
				type="button"
				variant="ghost"
			>
				Cancel
			</Button>
		{:else}
			<Button
				disabled={isSaving}
				onclick={() => (isConfirmingDelete = true)}
				size="sm"
				type="button"
				variant="ghost"
			>
				Delete
			</Button>
		{/if}
	</div>
</article>
