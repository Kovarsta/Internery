<script lang="ts">
	/**
	 * Verify a work record (`/work-records/[recordId]/verify`).
	 *
	 * Serves `GET /work-records/{recordId}/verify`, which recomputes the HMAC and answers
	 * `valid: true|false` for a public record. Skeleton only: no fetch yet.
	 */

	import { page } from '$app/state';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SkeletonNotice from '#lib/components/SkeletonNotice.svelte';
</script>

<PageHeader
	title="Verify a work record"
	description="Recomputes the signature over the stored record and reports whether it still matches."
/>

<p class="mb-4 text-xs tracking-wide text-slate-500 uppercase">
	Record id <span class="ml-1 font-mono text-slate-700 normal-case">{page.params.recordId}</span>
</p>

<div class="rounded-xl border border-slate-200 bg-white p-6">
	<div class="flex items-center gap-3">
		<div class="size-3 rounded-full bg-slate-300"></div>
		<div class="h-4 w-40 rounded bg-slate-200"></div>
	</div>

	<dl class="mt-6 grid gap-3 sm:grid-cols-2">
		{#each ['Student', 'Employer', 'Job', 'Period', 'Rating'] as field (field)}
			<div>
				<dt class="text-xs tracking-wide text-slate-500 uppercase">{field}</dt>
				<dd class="mt-1 h-3 w-2/3 rounded bg-slate-100"></dd>
			</div>
		{/each}
	</dl>
</div>

<div class="mt-4">
	<SkeletonNotice>
		Verify page skeleton. The endpoint is implemented; this page still needs the fetch and the
		valid/invalid states.
	</SkeletonNotice>
</div>
