<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SkeletonNotice from '#lib/components/SkeletonNotice.svelte';

	const sections = [
		{ href: resolve('/admin/users'), label: 'Users', hint: 'Search, lock and unlock accounts' },
		{ href: resolve('/admin/moderation'), label: 'Moderation', hint: 'Flagged and hidden jobs' },
		{ href: resolve('/admin/categories'), label: 'Categories', hint: 'Add, rename and deactivate' },
		{ href: resolve('/admin/verification'), label: 'Verification', hint: 'Employer badge requests' }
	];
</script>

<PageHeader
	title="Admin"
	description="Moderation, categories, verification and platform statistics."
/>

<div class="grid gap-3 sm:grid-cols-2">
	{#each sections as section (section.href)}
		<a
			class="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-400"
			href={section.href}
		>
			<span class="block font-medium text-slate-900">{section.label}</span>
			<span class="mt-1 block text-sm text-slate-600">{section.hint}</span>
		</a>
	{/each}
</div>

<div class="mt-6">
	<SkeletonNotice>
		Admin skeleton. Every admin operation is still a 501 skeleton; the section pages exist so the
		navigation can grow with them.
	</SkeletonNotice>
</div>
