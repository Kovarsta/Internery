<script lang="ts">
	/**
	 * Account hub (`/me`).
	 *
	 * Shows the account summary from `GET /me`, the avatar control and links into
	 * the area for the signed-in role. The editing lives on the profile pages.
	 */

	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import AvatarPanel from '#lib/components/profile/AvatarPanel.svelte';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { formatTimestamp } from '#lib/format.ts';
	import type { UserRole } from '#lib/api/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const me = $derived(data.me);

	const roleLabel: Record<UserRole, string> = {
		STUDENT: 'Student',
		EMPLOYER: 'Employer',
		ADMIN: 'Administrator'
	};

	const linksByRole: Record<UserRole, { href: ResolvedPathname; label: string; hint: string }[]> = {
		STUDENT: [
			{ href: resolve('me/profile'), label: 'Student profile', hint: 'University, skills, CV' },
			{
				href: resolve('me/notifications'),
				label: 'Notifications',
				hint: 'Application and job updates'
			},
			{
				href: resolve('me/applications'),
				label: 'Your dashboard',
				hint: 'Applications, saved jobs and work records'
			}
		],
		EMPLOYER: [
			{
				href: resolve('me/company-profile'),
				label: 'Company profile',
				hint: 'Organisation and contact'
			},
			{
				href: resolve('me/notifications'),
				label: 'Notifications',
				hint: 'Application updates'
			},
			{ href: resolve('me/verification'), label: 'Verification', hint: 'Request the badge' },
			{
				href: resolve('employer/jobs'),
				label: 'Your dashboard',
				hint: 'Jobs, applicants and postings'
			}
		],
		ADMIN: [{ href: resolve('admin'), label: 'Admin area', hint: 'Moderation and reports' }]
	};
</script>

<section>
	<div class="flex flex-wrap items-center gap-3">
		<h1 class="text-3xl font-extrabold tracking-tight">Hi, {me.fullName}</h1>
		<Badge class="bg-chalk/10 text-chalk" variant="ghost">{roleLabel[me.role]}</Badge>
	</div>
	<p class="mt-2 text-ink/70">{me.email}</p>

	<div class="mt-6 border-y border-rule py-5">
		<AvatarPanel user={me} />
	</div>

	<dl class="mt-8 grid gap-5 border-y border-rule py-6 sm:grid-cols-2">
		<div>
			<dt class="text-sm text-ink/60">Phone</dt>
			<dd class="mt-1 font-medium">{me.phone ?? 'Not set'}</dd>
		</div>
		<div>
			<dt class="text-sm text-ink/60">Account status</dt>
			<dd class="mt-1 font-medium">{me.status === 'ACTIVE' ? 'Active' : me.status}</dd>
		</div>
		<div>
			<dt class="text-sm text-ink/60">Member since</dt>
			<dd class="mt-1 font-medium">{formatTimestamp(me.createdAt)}</dd>
		</div>
	</dl>

	<h2 class="mt-8 text-lg font-semibold">Your area</h2>
	<nav class="mt-4 grid gap-3 sm:grid-cols-2">
		{#each linksByRole[me.role] as link (link.href)}
			<a class="border border-rule bg-card p-4 hover:border-chalk" href={link.href}>
				<span class="block font-medium">{link.label}</span>
				<span class="mt-1 block text-sm text-ink/60">{link.hint}</span>
			</a>
		{/each}
	</nav>
</section>
