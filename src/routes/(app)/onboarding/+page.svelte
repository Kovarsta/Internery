<script lang="ts">
	/**
	 * OAuth onboarding (`/onboarding`).
	 *
	 * One choice sets the account role. Each card is a submit button, so the
	 * page works without JavaScript.
	 */

	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<section class="mx-auto max-w-2xl">
	<p class="text-sm font-semibold tracking-wide text-chalk uppercase">Welcome, {data.name}</p>
	<h1 class="mt-2 text-3xl font-extrabold tracking-tight">How will you use Internery?</h1>
	<p class="mt-2 max-w-xl text-ink/70">
		Choose one. This sets up the right profile and dashboard for your account.
	</p>

	{#if form?.message}
		<Alert class="mt-5" variant="destructive">
			<AlertTitle>Choose a role</AlertTitle>
			<AlertDescription>{form.message}</AlertDescription>
		</Alert>
	{/if}

	<form class="mt-6 grid gap-4 sm:grid-cols-2" method="POST">
		<button
			class="group border border-rule bg-card p-6 text-left transition-colors hover:border-chalk"
			name="role"
			type="submit"
			value="STUDENT"
		>
			<span class="text-sm font-semibold text-chalk">Student</span>
			<span class="mt-2 block text-lg font-semibold">I'm looking for work</span>
			<span class="mt-2 block text-sm text-ink/70">
				Apply to shifts that fit your week and collect signed work records.
			</span>
			<span class="mt-4 block text-sm font-medium text-chalk group-hover:underline">
				Continue as a student
			</span>
		</button>

		<button
			class="group border border-rule bg-card p-6 text-left transition-colors hover:border-chalk"
			name="role"
			type="submit"
			value="EMPLOYER"
		>
			<span class="text-sm font-semibold text-chalk">Employer</span>
			<span class="mt-2 block text-lg font-semibold">I'm hiring students</span>
			<span class="mt-2 block text-sm text-ink/70">
				Post shifts, review applicants, and build a trusted company profile.
			</span>
			<span class="mt-4 block text-sm font-medium text-chalk group-hover:underline">
				Continue as an employer
			</span>
		</button>
	</form>

	<p class="mt-5 text-sm text-ink/60">
		Signed in as {data.email}. You can edit your profile after this step.
	</p>
</section>
