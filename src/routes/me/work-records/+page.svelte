<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SkeletonNotice from '#lib/components/SkeletonNotice.svelte';
</script>

<PageHeader
	title="My work records"
	description="Signed records issued by employers after a completed job. Private until you publish them."
/>

<div class="grid gap-3">
	{#each [1, 2] as placeholder (placeholder)}
		<article class="rounded-xl border border-slate-200 bg-white p-4">
			<div class="h-4 w-1/3 rounded bg-slate-200"></div>
			<div class="mt-2 h-3 w-1/2 rounded bg-slate-100"></div>
			<div class="mt-4 flex gap-2">
				<div class="h-7 w-24 rounded bg-slate-100"></div>
				<div class="h-7 w-24 rounded bg-slate-100"></div>
			</div>
		</article>
	{/each}
</div>

<div class="mt-4">
	<SkeletonNotice>
		Work-record skeleton. Records are created by the review flow, which is still to be built.
	</SkeletonNotice>
</div>
