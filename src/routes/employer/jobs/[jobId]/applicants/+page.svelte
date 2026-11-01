<script lang="ts">
	import { page } from '$app/state';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SkeletonNotice from '#lib/components/SkeletonNotice.svelte';
</script>

<PageHeader
	title="Applicants"
	description="Everyone who applied to this job, newest first, with their student summary."
/>

<p class="mb-4 text-xs tracking-wide text-slate-500 uppercase">
	Job id <span class="ml-1 font-mono text-slate-700 normal-case">{page.params.jobId}</span>
</p>

<div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
	<div class="divide-y divide-slate-100">
		{#each [1, 2] as placeholder (placeholder)}
			<div class="flex items-center gap-4 px-4 py-4">
				<div class="size-9 rounded-full bg-slate-100"></div>
				<div class="flex-1">
					<div class="h-3 w-1/4 rounded bg-slate-200"></div>
					<div class="mt-2 h-3 w-1/3 rounded bg-slate-100"></div>
				</div>
				<div class="h-7 w-20 rounded bg-slate-100"></div>
				<div class="h-7 w-20 rounded bg-slate-100"></div>
			</div>
		{/each}
	</div>
</div>

<div class="mt-4">
	<SkeletonNotice>
		Applicant skeleton. The list and the applicant profile are implemented; accept and reject arrive
		with the transactional phase.
	</SkeletonNotice>
</div>
