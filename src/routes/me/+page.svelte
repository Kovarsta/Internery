<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SkeletonNotice from '#lib/components/SkeletonNotice.svelte';

	const links = [
		{ href: resolve('/me/profile'), label: 'Student profile', hint: 'University, skills, CV' },
		{
			href: resolve('/employer/profile'),
			label: 'Company profile',
			hint: 'Organisation and contact'
		},
		{
			href: resolve('/me/applications'),
			label: 'My applications',
			hint: 'Status of every application'
		},
		{ href: resolve('/me/saved-jobs'), label: 'Saved jobs', hint: 'Bookmarked postings' },
		{
			href: resolve('/me/notifications'),
			label: 'Notifications',
			hint: 'Application and job updates'
		},
		{
			href: resolve('/me/verification'),
			label: 'Verification',
			hint: 'Request the Verified badge'
		},
		{ href: resolve('/me/work-records'), label: 'Work records', hint: 'Signed records you own' }
	];
</script>

<PageHeader
	title="My account"
	description="Account settings and everything tied to your profile."
/>

<div class="grid gap-3 sm:grid-cols-2">
	{#each links as link (link.href)}
		<a
			class="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-400"
			href={link.href}
		>
			<span class="block font-medium text-slate-900">{link.label}</span>
			<span class="mt-1 block text-sm text-slate-600">{link.hint}</span>
		</a>
	{/each}
</div>

<div class="mt-6">
	<SkeletonNotice>
		Account overview skeleton. Name, email and phone editing lives on this page once PATCH /me is
		wired.
	</SkeletonNotice>
</div>
