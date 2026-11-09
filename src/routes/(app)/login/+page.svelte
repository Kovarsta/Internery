<script lang="ts">
	/**
	 * Sign in (`/login`).
	 *
	 * The form posts to `+page.server.ts`, which signs in through Better Auth and
	 * writes the session cookie. Errors come back as `form.message`.
	 */

	import { resolve } from '$app/paths';
	import { enhance, type SubmitFunction } from '$app/forms';
	import { showSuccess } from '#lib/toast.ts';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	/**
	 * Keeps the sign-in on the client so the success toast survives the redirect.
	 * Without JavaScript the plain form still posts and lands on `/me`.
	 */
	const enhanceSignIn: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update();

			if (result.type === 'redirect') {
				showSuccess('Signed in.');
			}
		};
	};
</script>

<section class="max-w-md">
	<h1 class="text-3xl font-extrabold tracking-tight">Sign in</h1>
	<p class="mt-2 text-ink/70">Use the email address you registered with.</p>

	{#if data.registered}
		<Alert class="mt-5 border-chalk/30 bg-chalk/5">
			<AlertTitle>Check your inbox</AlertTitle>
			<AlertDescription>We sent a verification link. Open it before you sign in.</AlertDescription>
		</Alert>
	{/if}

	{#if data.reset}
		<Alert class="mt-5 border-chalk/30 bg-chalk/5">
			<AlertTitle>Password updated</AlertTitle>
			<AlertDescription>Sign in with your new password.</AlertDescription>
		</Alert>
	{/if}

	{#if form?.message}
		<Alert class="mt-5" variant="destructive">
			<AlertTitle>Cannot sign in</AlertTitle>
			<AlertDescription>{form.message}</AlertDescription>
		</Alert>
	{/if}

	<form
		class="mt-6 space-y-4 border-t-4 border-chalk bg-card p-6"
		method="POST"
		use:enhance={enhanceSignIn}
	>
		<div>
			<Label class="mb-1" for="signin-email">Email</Label>
			<Input
				autocomplete="email"
				id="signin-email"
				name="email"
				required
				type="email"
				value={form?.email ?? ''}
			/>
		</div>

		<div>
			<div class="flex items-baseline justify-between gap-3">
				<Label class="mb-1" for="signin-password">Password</Label>
				<a class="text-sm font-medium text-chalk hover:underline" href={resolve('forgot-password')}>
					Forgot password?
				</a>
			</div>
			<Input
				autocomplete="current-password"
				id="signin-password"
				name="password"
				required
				type="password"
			/>
		</div>

		<Button class="w-full" type="submit">Sign in</Button>
	</form>

	<p class="mt-4 text-sm text-ink/60">
		New here?
		<a class="font-medium text-chalk hover:underline" href={resolve('register')}>
			Create an account
		</a>
	</p>
</section>
