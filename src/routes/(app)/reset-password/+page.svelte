<script lang="ts">
	/**
	 * Reset password (`/reset-password?token=...`).
	 *
	 * The form posts the token back with the new password. An invalid or expired
	 * link is replaced by a prompt to request a fresh one.
	 */

	import { resolve } from '$app/paths';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<section class="max-w-md">
	<a class="text-sm font-medium text-chalk hover:underline" href={resolve('login')}>
		Back to sign in
	</a>

	<h1 class="mt-4 text-3xl font-extrabold tracking-tight">Choose a new password</h1>

	{#if data.invalid || form?.invalid}
		<Alert class="mt-5" variant="destructive">
			<AlertTitle>This link is invalid or expired</AlertTitle>
			<AlertDescription>Request a new password reset link to continue.</AlertDescription>
		</Alert>

		<Button class="mt-5" href={resolve('forgot-password')}>Request a new link</Button>
	{:else}
		<p class="mt-2 text-ink/70">Set a new password for your Internery account.</p>

		{#if form?.message}
			<Alert class="mt-5" variant="destructive">
				<AlertTitle>Cannot reset the password</AlertTitle>
				<AlertDescription>{form.message}</AlertDescription>
			</Alert>
		{/if}

		<form class="mt-6 space-y-4 border-t-4 border-chalk bg-card p-6" method="POST">
			<input name="token" type="hidden" value={data.token ?? ''} />

			<div>
				<Label class="mb-1" for="reset-password">New password</Label>
				<Input
					autocomplete="new-password"
					id="reset-password"
					minlength={8}
					name="password"
					required
					type="password"
				/>
				<p class="mt-1 text-xs text-ink/60">At least 8 characters.</p>
			</div>

			<div>
				<Label class="mb-1" for="reset-confirmation">Confirm new password</Label>
				<Input
					autocomplete="new-password"
					id="reset-confirmation"
					minlength={8}
					name="confirmation"
					required
					type="password"
				/>
			</div>

			<Button class="w-full" type="submit">Update password</Button>
		</form>

		<p class="mt-4 text-sm text-ink/60">
			Link expired?
			<a class="font-medium text-chalk hover:underline" href={resolve('forgot-password')}>
				Request a new one
			</a>
		</p>
	{/if}
</section>
