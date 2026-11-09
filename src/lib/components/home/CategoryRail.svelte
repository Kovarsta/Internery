<script lang="ts">
	/**
	 * Category shortcuts for `/`.
	 *
	 * Each chip opens the job search already filtered to that category. The home
	 * page passes a `limit` so the rail stays scannable; the full set is still
	 * available on `/jobs`.
	 */

	import { resolve } from '$app/paths';
	import type { Category } from '#lib/api/types.ts';

	let { categories, limit }: { categories: Category[]; limit?: number } = $props();

	const jobsPath = resolve('jobs');
	const shownCategories = $derived(limit === undefined ? categories : categories.slice(0, limit));
	const hasMore = $derived(limit !== undefined && categories.length > limit);
</script>

<ul class="flex flex-wrap gap-2">
	{#each shownCategories as category (category.id)}
		<li>
			<a
				class="inline-block border border-rule bg-card px-4 py-2 text-sm font-medium hover:border-chalk hover:text-chalk"
				href="{jobsPath}?categoryId={encodeURIComponent(category.id)}"
			>
				{category.name}
			</a>
		</li>
	{/each}

	{#if hasMore}
		<li>
			<a
				class="inline-block border border-chalk bg-chalk/5 px-4 py-2 text-sm font-medium text-chalk hover:bg-chalk/10"
				href={jobsPath}
			>
				More categories
			</a>
		</li>
	{/if}
</ul>
