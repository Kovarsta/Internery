<script lang="ts">
	/**
	 * Forgot password (`/forgot-password`).
	 *
	 * The action sends a reset link when the address exists, but the page shows
	 * the same confirmation either way so the form cannot reveal accounts.
	 */

	import { resolve } from '$app/paths';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<section class="max-w-md">
	<a class="text-sm font-medium text-chalk hover:underline" href={resolve('login')}>
		Back to sign in
	</a>

	<h1 class="mt-4 text-3xl font-extrabold tracking-tight">Forgot your password?</h1>
	<p class="mt-2 text-ink/70">
		Enter the email you registered with. We will send a link to choose a new password.
	</p>

	{#if form?.sent}
		<Alert class="mt-5 border-chalk/30 bg-chalk/5">
			<AlertTitle>Check your inbox</AlertTitle>
			<AlertDescription>
				If that address is registered, we sent a reset link. It expires in one hour.
			</AlertDescription>
		</Alert>
	{/if}

	{#if form?.message}
		<Alert class="mt-5" variant="destructive">
			<AlertTitle>Cannot send the link</AlertTitle>
			<AlertDescription>{form.message}</AlertDescription>
		</Alert>
	{/if}

	<form class="mt-6 space-y-4 border-t-4 border-chalk bg-card p-6" method="POST">
		<div>
			<Label class="mb-1" for="forgot-email">Email</Label>
			<Input
				autocomplete="email"
				id="forgot-email"
				name="email"
				required
				type="email"
				value={form?.email ?? ''}
			/>
		</div>

		<Button class="w-full" type="submit">Send reset link</Button>
	</form>

	<p class="mt-4 text-sm text-ink/60">
		Remembered it?
		<a class="font-medium text-chalk hover:underline" href={resolve('login')}>Sign in</a>
	</p>
</section>
