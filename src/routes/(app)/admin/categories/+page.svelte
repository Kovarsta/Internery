<script lang="ts">
	/**
	 * Admin categories (`/admin/categories`).
	 *
	 * Lists every category, including the deactivated ones, and lets an admin add,
	 * rename, deactivate or delete one. A category in use cannot be deleted, so
	 * deactivation is the safe way to retire it.
	 */

	import CategoryCreateForm from '#lib/components/admin/CategoryCreateForm.svelte';
	import CategoryRow from '#lib/components/admin/CategoryRow.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const activeCount = $derived(data.categories.filter((category) => category.isActive).length);
</script>

<PageHeader
	title="Categories"
	description="Categories in use can be deactivated but not deleted. Deactivated categories disappear from new-job forms and stay on existing jobs."
/>

<CategoryCreateForm />

<p class="mt-4 text-sm text-ink/70">
	{activeCount} active of
	{data.categories.length}
	{data.categories.length === 1 ? 'category' : 'categories'}.
</p>

{#if data.categories.length > 0}
	<div class="mt-2 divide-y divide-rule border-t border-rule">
		{#each data.categories as category (category.id)}
			<CategoryRow {category} />
		{/each}
	</div>
{:else}
	<p class="mt-6 border border-rule bg-card p-5 text-sm text-ink/70">
		No categories yet. Add the first one above.
	</p>
{/if}
