<script lang="ts">
	/**
	 * Admin categories (`/admin/categories`).
	 *
	 * Lists every category, including the deactivated ones, and lets an admin add,
	 * rename, deactivate or delete one. A category in use cannot be deleted, so
	 * deactivation is the safe way to retire it.
	 */

	import { resolve } from '$app/paths';
	import CategoryCreateForm from '#lib/components/admin/CategoryCreateForm.svelte';
	import CategoryRow from '#lib/components/admin/CategoryRow.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const activeCount = $derived(data.categories.filter((category) => category.isActive).length);
	const hasSearch = $derived(data.search !== '');
</script>

<PageHeader
	title="Categories"
	description="Categories in use can be deactivated but not deleted. Deactivated categories disappear from new-job forms and stay on existing jobs."
/>

<CategoryCreateForm />

<form class="mt-4 flex flex-wrap items-end gap-2" method="get">
	<div class="min-w-56 flex-1">
		<Label class="mb-1" for="category-search">Search categories</Label>
		<Input
			id="category-search"
			maxlength={100}
			name="q"
			placeholder="Food, retail, tutoring..."
			type="search"
			value={data.search}
		/>
	</div>

	<Button size="sm" type="submit">Search</Button>
	{#if hasSearch}
		<Button href={resolve('admin/categories')} size="sm" variant="ghost">Clear</Button>
	{/if}
</form>

<p class="mt-4 text-sm text-ink/70">
	{#if hasSearch}
		{data.categories.length}
		{data.categories.length === 1 ? 'category matches' : 'categories match'}
		"{data.search}".
	{:else}
		{activeCount} active of
		{data.totalCategories}
		{data.totalCategories === 1 ? 'category' : 'categories'}.
	{/if}
</p>

{#if data.categories.length > 0}
	<div class="mt-2 divide-y divide-rule border-t border-rule">
		{#each data.categories as category (category.id)}
			<CategoryRow {category} />
		{/each}
	</div>
{:else if hasSearch}
	<p class="mt-6 border border-rule bg-card p-5 text-sm text-ink/70">
		No category matches "{data.search}".
		<a class="font-medium text-chalk hover:underline" href={resolve('admin/categories')}>
			Clear the search
		</a>.
	</p>
{:else}
	<p class="mt-6 border border-rule bg-card p-5 text-sm text-ink/70">
		No categories yet. Add the first one above.
	</p>
{/if}
