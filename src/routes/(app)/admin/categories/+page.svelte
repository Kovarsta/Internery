<script lang="ts">
	/**
	 * Admin categories (`/admin/categories`).
	 *
	 * Will serve the category create, update and delete operations under `/admin/categories`.
	 * The public list already comes from `GET /categories`. Skeleton only.
	 */

	import PageHeader from '#lib/components/PageHeader.svelte';
	import SkeletonNotice from '#lib/components/SkeletonNotice.svelte';
</script>

<PageHeader
	title="Categories"
	description="Add categories, rename them, or deactivate unused ones."
/>

<form class="mb-4 flex max-w-md gap-2">
	<label class="sr-only" for="category-name">Category name</label>
	<input
		class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
		id="category-name"
		name="name"
		placeholder="Food & Beverage"
		type="text"
	/>
	<button
		class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
		disabled
		type="button"
	>
		Add
	</button>
</form>

<div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
	<div class="divide-y divide-slate-100">
		{#each [1, 2, 3] as placeholder (placeholder)}
			<div class="flex items-center gap-4 px-4 py-3">
				<div class="h-3 w-1/3 rounded bg-slate-200"></div>
				<div class="ml-auto h-3 w-16 rounded bg-slate-100"></div>
			</div>
		{/each}
	</div>
</div>

<div class="mt-4">
	<SkeletonNotice>Skeleton. Category create, update and delete are still 501.</SkeletonNotice>
</div>
