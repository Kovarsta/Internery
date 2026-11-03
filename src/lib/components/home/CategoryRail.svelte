<script lang="ts">
	/**
	 * Category shortcuts for `/`.
	 *
	 * Each chip opens the job search already filtered to that category, so a visitor can narrow the
	 * list without filling in the filter bar.
	 */

	import { resolve } from '$app/paths';
	import type { Category } from '#lib/api/types.ts';

	let { categories }: { categories: Category[] } = $props();

	const jobsPath = resolve('jobs');
</script>

<ul class="flex flex-wrap gap-2">
	{#each categories as category (category.id)}
		<li>
			<a
				class="inline-block border border-rule bg-card px-4 py-2 text-sm font-medium hover:border-chalk hover:text-chalk"
				href="{jobsPath}?categoryId={encodeURIComponent(category.id)}"
			>
				{category.name}
			</a>
		</li>
	{/each}
</ul>
