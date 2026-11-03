<script lang="ts">
	/**
	 * Admin users (`/admin/users`).
	 *
	 * Will serve `GET /admin/users` plus the lock and unlock actions. Skeleton only: the handler
	 * still returns `501`.
	 */

	import PageHeader from '#lib/components/PageHeader.svelte';
	import SkeletonNotice from '#lib/components/SkeletonNotice.svelte';
</script>

<PageHeader title="Users" description="Search accounts, then lock or unlock them with a reason." />

<form class="mb-4 flex max-w-md gap-2">
	<label class="sr-only" for="admin-user-search">Search users</label>
	<input
		class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
		id="admin-user-search"
		name="q"
		placeholder="Name or email"
		type="search"
	/>
	<button
		class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
		disabled
		type="button"
	>
		Search
	</button>
</form>

<div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
	<div class="divide-y divide-slate-100">
		{#each [1, 2, 3] as placeholder (placeholder)}
			<div class="flex items-center gap-4 px-4 py-3">
				<div class="h-3 w-1/4 rounded bg-slate-200"></div>
				<div class="h-3 w-1/3 rounded bg-slate-100"></div>
				<div class="ml-auto h-7 w-20 rounded bg-slate-100"></div>
			</div>
		{/each}
	</div>
</div>

<div class="mt-4">
	<SkeletonNotice>Skeleton. GET /admin/users is still a 501 handler.</SkeletonNotice>
</div>
