<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SkeletonNotice from '#lib/components/SkeletonNotice.svelte';
</script>

<PageHeader
	title="Saved jobs"
	description="Bookmarked jobs, newest save first. Closed jobs stay here with their status."
/>

<div class="grid gap-3">
	{#each [1, 2] as placeholder (placeholder)}
		<article class="rounded-xl border border-slate-200 bg-white p-4">
			<div class="h-4 w-1/3 rounded bg-slate-200"></div>
			<div class="mt-2 h-3 w-1/2 rounded bg-slate-100"></div>
		</article>
	{/each}
</div>

<div class="mt-4">
	<SkeletonNotice>
		Saved-jobs skeleton. Bookmark and unbookmark are implemented; this page only needs the list.
	</SkeletonNotice>
</div>
