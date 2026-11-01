<script lang="ts">
	/**
	 * Job search (`/jobs`).
	 *
	 * Serves `GET /jobs` for the result page and `GET /categories` for the filter. Both are
	 * paged; the contract also supports keyword, location, salary, date and verified filters.
	 * Skeleton only: the filter form and the result cards are static.
	 */

	import PageHeader from '#lib/components/PageHeader.svelte';
	import SkeletonNotice from '#lib/components/SkeletonNotice.svelte';
</script>

<PageHeader
	title="Find a job"
	description="Search open part-time jobs by keyword, category, location and pay."
/>

<form class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
	<div class="sm:col-span-2">
		<label class="block text-sm font-medium text-slate-700" for="job-keyword">Keyword</label>
		<input
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="job-keyword"
			name="q"
			placeholder="Barista, tutor, event staff"
			type="search"
		/>
	</div>

	<div>
		<label class="block text-sm font-medium text-slate-700" for="job-category">Category</label>
		<select
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="job-category"
			name="categoryId"
		>
			<option value="">Any category</option>
		</select>
	</div>

	<div>
		<label class="block text-sm font-medium text-slate-700" for="job-location">Location</label>
		<input
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="job-location"
			name="location"
			placeholder="Hanoi"
		/>
	</div>

	<div class="sm:col-span-4">
		<button
			class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
			disabled
			type="button"
		>
			Search
		</button>
		<span class="ml-3 text-xs text-slate-500">Search is not wired to GET /jobs yet.</span>
	</div>
</form>

<div class="mt-6 grid gap-3">
	{#each [1, 2, 3] as placeholder (placeholder)}
		<article class="rounded-xl border border-slate-200 bg-white p-4">
			<div class="h-4 w-1/3 rounded bg-slate-200"></div>
			<div class="mt-2 h-3 w-1/2 rounded bg-slate-100"></div>
			<div class="mt-4 h-3 w-1/4 rounded bg-slate-100"></div>
		</article>
	{/each}
</div>

<div class="mt-6">
	<SkeletonNotice
		>Job cards placeholders. Pagination and empty states are not built yet.</SkeletonNotice
	>
</div>
