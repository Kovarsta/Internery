<script lang="ts">
	/**
	 * General account fields shared by every role: name and phone.
	 *
	 * The page owns the form action; this component only renders the card and the
	 * account-specific alerts. Email and password stay on the security page.
	 */

	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';

	type Values = {
		fullName: string;
		phone: string;
	};

	type Props = {
		values: Values;
		action: string;
		message?: string;
		saved?: boolean;
	};

	let { values, action, message, saved = false }: Props = $props();
</script>

{#if saved}
	<Alert class="mb-6 border-chalk/30 bg-chalk/5">
		<AlertTitle>Personal details saved</AlertTitle>
		<AlertDescription>Your name and phone are up to date.</AlertDescription>
	</Alert>
{/if}

{#if message}
	<Alert class="mb-6" variant="destructive">
		<AlertTitle>Cannot save your details</AlertTitle>
		<AlertDescription>{message}</AlertDescription>
	</Alert>
{/if}

<form
	class="mb-6 grid max-w-3xl gap-4 border-t-4 border-chalk bg-card p-6 sm:grid-cols-2"
	method="POST"
	{action}
>
	<div class="sm:col-span-2">
		<h2 class="text-lg font-semibold">Personal details</h2>
		<p class="mt-1 max-w-xl text-sm text-ink/70">
			This name appears on applications and reviews. Your phone number is optional and is not shown
			on your public profile.
		</p>
	</div>

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

	<div class="flex justify-end sm:col-span-2">
		<Button type="submit">Save details</Button>
	</div>
</form>
