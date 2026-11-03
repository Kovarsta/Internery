<script lang="ts">
	/**
	 * Create account (`/register`).
	 *
	 * Students apply for jobs and employers post them; the chosen role is sent to
	 * `+page.server.ts` and stored after Better Auth creates the user. The address
	 * must be verified before the first sign-in.
	 */

	import { resolve } from '$app/paths';
	import { enhance, type SubmitFunction } from '$app/forms';
	import { showSuccess } from '#lib/toast.ts';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { NativeSelect, NativeSelectOption } from '#lib/components/ui/native-select/index.ts';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	/**
	 * Keeps registration on the client so the toast survives the redirect to the
	 * sign-in page. Without JavaScript the plain form still posts.
	 */
	const enhanceRegister: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update();

			if (result.type === 'redirect') {
				showSuccess('Account created. Check your inbox.');
			}
		};
	};
</script>

<section class="max-w-md">
	<h1 class="text-3xl font-extrabold tracking-tight">Create an account</h1>
	<p class="mt-2 text-ink/70">
		Students apply for jobs; employers post them. Verify your email before signing in.
	</p>

	{#if form?.message}
		<Alert class="mt-5" variant="destructive">
			<AlertTitle>Cannot create the account</AlertTitle>
			<AlertDescription>{form.message}</AlertDescription>
		</Alert>
	{/if}

	<form
		class="mt-6 space-y-4 border-t-4 border-chalk bg-card p-6"
		method="POST"
		use:enhance={enhanceRegister}
	>
		<div>
			<Label class="mb-1" for="register-name">Full name</Label>
			<Input
				autocomplete="name"
				id="register-name"
				name="name"
				required
				type="text"
				value={form?.name ?? ''}
			/>
		</div>

		<div>
			<Label class="mb-1" for="register-email">Email</Label>
			<Input
				autocomplete="email"
				id="register-email"
				name="email"
				required
				type="email"
				value={form?.email ?? ''}
			/>
		</div>

		<div>
			<Label class="mb-1" for="register-password">Password</Label>
			<Input
				autocomplete="new-password"
				id="register-password"
				minlength={8}
				name="password"
				required
				type="password"
			/>
			<p class="mt-1 text-xs text-ink/60">At least 8 characters.</p>
		</div>

		<div>
			<Label class="mb-1" for="register-role">I am a</Label>
			<NativeSelect class="w-full" id="register-role" name="role" value={form?.role ?? 'STUDENT'}>
				<NativeSelectOption value="STUDENT">Student looking for part-time work</NativeSelectOption>
				<NativeSelectOption value="EMPLOYER">Employer posting jobs</NativeSelectOption>
			</NativeSelect>
		</div>

		<Button class="w-full" type="submit">Create account</Button>
	</form>

	<p class="mt-4 text-sm text-ink/60">
		Already have an account?
		<a class="font-medium text-chalk hover:underline" href={resolve('login')}>Sign in</a>
	</p>
</section>
