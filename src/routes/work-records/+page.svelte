<script lang="ts">
	/**
	 * Public work records (`/work-records`).
	 *
	 * Serves `GET /work-records`, the directory of records students chose to publish. Empty until
	 * the review flow issues a record. Skeleton only.
	 */

	import PageHeader from '#lib/components/PageHeader.svelte';
	import SkeletonNotice from '#lib/components/SkeletonNotice.svelte';
</script>

<PageHeader
	title="Work records"
	description="Public work records students chose to publish, newest first."
/>

<div class="grid gap-3 sm:grid-cols-2">
	{#each [1, 2, 3, 4] as placeholder (placeholder)}
		<article class="rounded-xl border border-slate-200 bg-white p-5">
			<div class="h-4 w-2/3 rounded bg-slate-200"></div>
			<div class="mt-2 h-3 w-1/2 rounded bg-slate-100"></div>
			<div class="mt-4 h-3 w-1/3 rounded bg-slate-100"></div>
		</article>
	{/each}
</div>

<div class="mt-6">
	<SkeletonNotice>
		Public directory skeleton. GET /work-records returns published cards; no records exist until the
		review flow issues one.
	</SkeletonNotice>
</div>
