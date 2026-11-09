<script lang="ts">
	/**
	 * Account hub (`/me`).
	 *
	 * Shows the account summary from `GET /me`, the avatar control and an editable
	 * form for the common name and phone. Email and password are credentials and
	 * stay out of this form. The rest of the editing lives on the profile pages.
	 */

	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import AvatarPanel from '#lib/components/profile/AvatarPanel.svelte';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { formatTimestamp } from '#lib/format.ts';
	import type { UserRole } from '#lib/api/types.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const me = $derived(data.me);
	const values = $derived(
		form?.values ?? {
			fullName: me.fullName,
			phone: me.phone ?? ''
		}
	);

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

	{#if data.saved}
		<Alert class="mt-6 border-chalk/30 bg-chalk/5">
			<AlertTitle>Account details saved</AlertTitle>
			<AlertDescription>Your name and phone are up to date.</AlertDescription>
		</Alert>
	{/if}

	{#if form?.message}
		<Alert class="mt-6" variant="destructive">
			<AlertTitle>Cannot save your details</AlertTitle>
			<AlertDescription>{form.message}</AlertDescription>
		</Alert>
	{/if}

	<form class="mt-8 max-w-3xl border-t-4 border-chalk bg-card p-6" method="POST">
		<h2 class="text-lg font-semibold">Account details</h2>
		<p class="mt-1 max-w-xl text-sm text-ink/70">
			This name appears on applications and reviews. Your phone number is optional and is not shown
			on your public profile.
		</p>

		<div class="mt-5 grid gap-4 sm:grid-cols-2">
			<div>
				<Label class="mb-1" for="account-full-name">Full name</Label>
				<Input
					autocomplete="name"
					id="account-full-name"
					maxlength={120}
					name="fullName"
					required
					value={values.fullName}
				/>
			</div>

			<div>
				<Label class="mb-1" for="account-phone">Phone</Label>
				<Input
					autocomplete="tel"
					id="account-phone"
					maxlength={20}
					name="phone"
					type="tel"
					value={values.phone}
				/>
				<p class="mt-1 text-xs text-ink/60">Leave it empty to remove it.</p>
			</div>
		</div>

		<div class="mt-5 flex justify-end">
			<Button type="submit">Save details</Button>
		</div>
	</form>

	<dl class="mt-8 grid gap-5 border-y border-rule py-6 sm:grid-cols-2">
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
