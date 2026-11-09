<script lang="ts">
	/**
	 * Admin personal details (`/me/admin-profile`).
	 *
	 * Reuses the shared account form so the name and phone follow the same rules
	 * as the student and company profile pages.
	 */

	import AccountDetailsForm from '#lib/components/profile/AccountDetailsForm.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const values = $derived(
		form?.values ?? {
			fullName: data.me.fullName,
			phone: data.me.phone ?? ''
		}
	);
</script>

<PageHeader
	title="Admin profile"
	description="Your name appears in the admin area. Your phone number is private and is not shown publicly."
/>

<AccountDetailsForm
	action="?/account"
	description="This name appears in the admin area. Your phone number is optional and is private."
	message={form?.message}
	saved={data.accountSaved}
	{values}
/>
