<script lang="ts">
	/**
	 * Admin verification queue (`/admin/verification`).
	 *
	 * Will serve `GET /admin/verification-requests` plus approve and reject. Skeleton only: the
	 * handlers still return `501`.
	 */

	import PageHeader from '#lib/components/PageHeader.svelte';
	import SkeletonNotice from '#lib/components/SkeletonNotice.svelte';
</script>

<PageHeader
	title="Verification requests"
	description="Employer badge requests, with the licence and the contact details to check."
/>

<div class="grid gap-3">
	{#each [1, 2] as placeholder (placeholder)}
		<article class="rounded-xl border border-slate-200 bg-white p-5">
			<div class="h-4 w-1/4 rounded bg-slate-200"></div>
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
		Skeleton. The admin verification queue and the approve/reject handlers are still 501.
	</SkeletonNotice>
</div>
