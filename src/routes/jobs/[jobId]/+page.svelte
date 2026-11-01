<script lang="ts">
	/**
	 * Job detail (`/jobs/[jobId]`).
	 *
	 * Serves `GET /jobs/{jobId}` and, for students, the save and apply actions through
	 * `PUT /me/saved-jobs/{jobId}` and `POST /jobs/{jobId}/applications`. The endpoint already
	 * hides the student-only fields from other visitors. Skeleton only: no data load yet.
	 */

	import { page } from '$app/state';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SkeletonNotice from '#lib/components/SkeletonNotice.svelte';
</script>

<PageHeader
	title="Job details"
	description="Description, schedule, pay and employer, with the apply action for students."
/>

<div class="grid gap-6 lg:grid-cols-3">
	<section class="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
		<p class="text-xs tracking-wide text-slate-500 uppercase">Job id</p>
		<p class="mt-1 font-mono text-sm text-slate-700">{page.params.jobId}</p>

		<div class="mt-6 space-y-3">
			<div class="h-4 w-2/3 rounded bg-slate-200"></div>
			<div class="h-3 w-full rounded bg-slate-100"></div>
			<div class="h-3 w-5/6 rounded bg-slate-100"></div>
			<div class="h-3 w-4/6 rounded bg-slate-100"></div>
		</div>
	</section>

	<aside class="rounded-xl border border-slate-200 bg-white p-6">
		<h2 class="text-sm font-medium text-slate-900">Employer</h2>
		<div class="mt-3 h-3 w-2/3 rounded bg-slate-100"></div>
		<div class="mt-2 h-3 w-1/2 rounded bg-slate-100"></div>

		<button
			class="mt-6 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
			disabled
			type="button"
		>
			Apply
		</button>
		<p class="mt-2 text-xs text-slate-500">Apply is not wired to the API yet.</p>
	</aside>
</div>

<div class="mt-6">
	<SkeletonNotice>
		Job detail skeleton. Saved state, application state and the hidden-job rules arrive with the
		data load.
	</SkeletonNotice>
</div>
