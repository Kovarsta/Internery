<script lang="ts">
	/**
	 * Home (`/`).
	 *
	 * Entry point for guests and signed-in users: links into job search and registration.
	 * The featured categories and latest jobs will come from `GET /categories` and `GET /jobs`.
	 * Skeleton only: no data load yet.
	 */

	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SkeletonNotice from '#lib/components/SkeletonNotice.svelte';
</script>

<PageHeader
	title="Part-time work for students"
	description="Browse open jobs, apply with your profile, and build a signed work record."
/>

<div class="grid gap-4 sm:grid-cols-2">
	<a
		class="rounded-xl border border-slate-200 bg-white p-6 hover:border-slate-400"
		href={resolve('/jobs')}
	>
		<h2 class="text-lg font-medium text-slate-900">Browse jobs</h2>
		<p class="mt-1 text-sm text-slate-600">Filter by category, location and pay.</p>
	</a>

	<a
		class="rounded-xl border border-slate-200 bg-white p-6 hover:border-slate-400"
		href={resolve('/register')}
	>
		<h2 class="text-lg font-medium text-slate-900">Create an account</h2>
		<p class="mt-1 text-sm text-slate-600">Students apply for work; employers post it.</p>
	</a>
</div>

<div class="mt-8">
	<SkeletonNotice>
		Home page skeleton. The featured categories and latest jobs are not connected to the API yet.
	</SkeletonNotice>
</div>
