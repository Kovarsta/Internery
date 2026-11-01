<script lang="ts">
	/**
	 * My jobs (`/employer/jobs`).
	 *
	 * Serves `GET /me/jobs`, which already returns `applicantCount`, `acceptedCount`, `isHidden`
	 * and `hiddenReason` per job. Links to the create and applicant pages. Skeleton only.
	 */

	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SkeletonNotice from '#lib/components/SkeletonNotice.svelte';
</script>

<div class="flex flex-wrap items-center justify-between gap-3">
	<PageHeader
		title="My jobs"
		description="Every job you posted, with applicant and accepted counts."
	/>
	<a
		class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
		href={resolve('/employer/jobs/new')}
	>
		Post a job
	</a>
</div>

<div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
	<div class="divide-y divide-slate-100">
		{#each [1, 2, 3] as placeholder (placeholder)}
			<div class="flex items-center gap-4 px-4 py-4">
				<div class="flex-1">
					<div class="h-4 w-1/3 rounded bg-slate-200"></div>
					<div class="mt-2 h-3 w-1/4 rounded bg-slate-100"></div>
				</div>
				<div class="h-3 w-16 rounded bg-slate-100"></div>
				<div class="h-7 w-20 rounded bg-slate-100"></div>
			</div>
		{/each}
	</div>
</div>

<div class="mt-4">
	<SkeletonNotice>
		My-jobs skeleton. GET /me/jobs already returns status, applicant and accepted counts.
	</SkeletonNotice>
</div>
