<script lang="ts">
	/**
	 * Pagination for `/jobs`.
	 *
	 * Keeps the active filters in the URL. Pages are 1-based, matching the API.
	 */

	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	type Props = {
		page: number;
		pageSize: number;
		total: number;
		query: string;
	};

	let { page, pageSize, total, query }: Props = $props();

	const totalPages = $derived(Math.max(1, Math.ceil(total / pageSize)));

	function pageHref(target: number): ResolvedPathname {
		const params = new SvelteURLSearchParams(query);
		params.set('page', String(target));

		// resolve() handles the path and base; the query string is runtime data.
		return `${resolve('jobs')}?${params.toString()}` as ResolvedPathname;
	}
</script>

{#if totalPages > 1}
	<nav class="mt-6 flex items-center justify-between text-sm" aria-label="Pagination">
		{#if page > 1}
			<a class="font-medium text-chalk hover:underline" href={pageHref(page - 1)}>Previous</a>
		{:else}
			<span class="text-ink/40">Previous</span>
		{/if}

		<span class="text-ink/60">Page {page} of {totalPages}</span>

		{#if page < totalPages}
			<a class="font-medium text-chalk hover:underline" href={pageHref(page + 1)}>Next</a>
		{:else}
			<span class="text-ink/40">Next</span>
		{/if}
	</nav>
{/if}
