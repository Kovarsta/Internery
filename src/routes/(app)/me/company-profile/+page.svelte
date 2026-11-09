<script lang="ts">
	/**
	 * Company profile (`/me/company-profile`).
	 *
	 * Reads the profile through `GET /me/employer-profile` and saves it with the form action, which
	 * sends `PUT /me/employer-profile`. Verification state and ratings are read-only here.
	 */

	import PageHeader from '#lib/components/PageHeader.svelte';
	import AccountDetailsForm from '#lib/components/profile/AccountDetailsForm.svelte';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { NativeSelect, NativeSelectOption } from '#lib/components/ui/native-select/index.ts';
	import { Textarea } from '#lib/components/ui/textarea/index.ts';
	import { verificationStatusClass, verificationStatusLabel } from '#lib/labels.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const profile = $derived(data.profile);
	const values = $derived(
		form?.scope === 'company'
			? form.values
			: {
					orgName: profile.orgName,
					orgType: profile.orgType,
					description: profile.description ?? '',
					address: profile.address ?? '',
					contactPhone: profile.contactPhone ?? ''
				}
	);

	const accountValues = $derived(
		form?.scope === 'account'
			? form.values
			: {
					fullName: data.me.fullName,
					phone: data.me.phone ?? ''
				}
	);
</script>

<PageHeader
	title="Company profile"
	description="Shown on every job you post. Verified employers can filter into verified-only search."
/>

<div class="mb-6 flex items-center gap-2 text-sm text-ink/70">
	<span>Verification</span>
	<Badge class={verificationStatusClass[profile.verificationStatus]}>
		{verificationStatusLabel[profile.verificationStatus]}
	</Badge>
</div>

<AccountDetailsForm
	action="?/account"
	message={form?.scope === 'account' ? form.message : undefined}
	saved={data.accountSaved}
	values={accountValues}
/>

{#if data.saved}
	<Alert class="mb-6 border-chalk/30 bg-chalk/5">
		<AlertTitle>Profile saved</AlertTitle>
		<AlertDescription>New job posts use the updated company details.</AlertDescription>
	</Alert>
{/if}

{#if form?.scope === 'company' && form.message}
	<Alert class="mb-6" variant="destructive">
		<AlertTitle>Cannot save the profile</AlertTitle>
		<AlertDescription>{form.message}</AlertDescription>
	</Alert>
{/if}

<form
	class="grid max-w-3xl gap-4 border-t-4 border-chalk bg-card p-6 sm:grid-cols-2"
	method="POST"
	action="?/company"
>
	<div class="sm:col-span-2">
		<h2 class="text-lg font-semibold">Company details</h2>
	</div>

	<div>
		<Label class="mb-1" for="org-name">Organisation name</Label>
		<Input id="org-name" maxlength={200} name="orgName" required value={values.orgName} />
	</div>

	<div>
		<Label class="mb-1" for="org-type">Organisation type</Label>
		<NativeSelect class="w-full" id="org-type" name="orgType" value={values.orgType}>
			<NativeSelectOption value="COMPANY">Company</NativeSelectOption>
			<NativeSelectOption value="INDIVIDUAL">Individual</NativeSelectOption>
		</NativeSelect>
	</div>

	<div class="sm:col-span-2">
		<Label class="mb-1" for="org-description">About</Label>
		<Textarea
			class="bg-card"
			id="org-description"
			maxlength={2000}
			name="description"
			rows={5}
			value={values.description}
		/>
	</div>

	<div>
		<Label class="mb-1" for="org-address">Address</Label>
		<Input id="org-address" maxlength={300} name="address" value={values.address} />
	</div>

	<div>
		<Label class="mb-1" for="org-phone">Contact phone</Label>
		<Input
			id="org-phone"
			maxlength={20}
			name="contactPhone"
			type="tel"
			value={values.contactPhone}
		/>
	</div>

	<div class="flex justify-end sm:col-span-2">
		<Button type="submit">Save profile</Button>
	</div>
</form>
