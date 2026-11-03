<script lang="ts">
	/**
	 * Admin hub (`/admin`).
	 *
	 * Shows platform counts from `GET /admin/stats` with an optional date range,
	 * then links to the four moderation areas. The header links come from the
	 * layout; this page explains what each area is for.
	 */

	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import StatsGrid from '#lib/components/admin/StatsGrid.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const sections = [
		{ href: resolve('admin/users'), label: 'Users', hint: 'Search, lock and unlock accounts' },
		{
			href: resolve('admin/moderation'),
			label: 'Moderation',
			hint: 'Reported, hidden and flagged jobs'
		},
		{ href: resolve('admin/categories'), label: 'Categories', hint: 'Add, rename and deactivate' },
		{ href: resolve('admin/verification'), label: 'Verification', hint: 'Employer badge requests' }
	];

	const hasRange = $derived(data.from !== '' || data.to !== '');
</script>

<PageHeader
	title="Admin"
	description="Moderation, categories, verification and platform statistics."
/>

<section class="border border-rule bg-card p-5">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h2 class="text-lg font-semibold">
				{hasRange ? 'Counts in the selected range' : 'All-time counts'}
			</h2>
			<p class="mt-1 text-sm text-ink/70">
				Rows are counted by when they were created. Jobs are counted by their current state.
			</p>
		</div>

		<form class="flex flex-wrap items-end gap-2" method="get">
			<div>
				<Label class="mb-1" for="stats-from">From</Label>
				<Input id="stats-from" name="from" type="date" value={data.from} />
			</div>

			<div>
				<Label class="mb-1" for="stats-to">To</Label>
				<Input id="stats-to" name="to" type="date" value={data.to} />
			</div>

			<Button size="sm" type="submit" variant="outline">Apply</Button>
			{#if hasRange}
				<Button href={resolve('admin')} size="sm" variant="ghost">Clear</Button>
			{/if}
		</form>
	</div>

	<div class="mt-5">
		<StatsGrid stats={data.stats} />
	</div>
</section>

<div class="mt-6 grid gap-3 sm:grid-cols-2">
	{#each sections as section (section.href)}
		<a class="border border-rule bg-card p-5 hover:border-chalk/40" href={section.href}>
			<span class="block font-medium">{section.label}</span>
			<span class="mt-1 block text-sm text-ink/70">{section.hint}</span>
		</a>
	{/each}
</div>
