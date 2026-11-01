<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SkeletonNotice from '#lib/components/SkeletonNotice.svelte';
</script>

<PageHeader
	title="My applications"
	description="Every application you submitted, newest first, with its current status."
/>

<div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
	<div class="border-b border-slate-200 px-4 py-3">
		<div class="h-3 w-40 rounded bg-slate-200"></div>
	</div>

	<div class="divide-y divide-slate-100">
		{#each [1, 2, 3] as placeholder (placeholder)}
			<div class="flex items-center gap-4 px-4 py-3">
				<div class="h-3 w-1/3 rounded bg-slate-100"></div>
				<div class="h-3 w-24 rounded bg-slate-100"></div>
				<div class="ml-auto h-3 w-16 rounded bg-slate-100"></div>
			</div>
		{/each}
	</div>
</div>

<div class="mt-4">
	<SkeletonNotice>
		Applications skeleton. GET /me/applications supports a status filter; the withdraw action is
		already implemented.
	</SkeletonNotice>
</div>
