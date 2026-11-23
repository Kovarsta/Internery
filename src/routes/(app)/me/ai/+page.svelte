<script lang="ts">
	/**
	 * AI settings (`/me/ai`).
	 *
	 * Shows the consent state from `GET /me/ai/consent` and lets a student grant
	 * or withdraw it through the page action. Withdrawal is confirmed because it
	 * also deletes the cached explanations derived from the CV.
	 */

	import { resolve } from '$app/paths';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { formatTimestamp } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const consent = $derived(data.consent);
	let confirmWithdraw = $state(false);

	/** Submits the hidden withdrawal form after the dialog is confirmed. */
	function submitWithdrawal() {
		const formElement = document.getElementById('withdraw-consent');

		if (formElement instanceof HTMLFormElement) {
			formElement.requestSubmit();
		}
	}
</script>

<PageHeader
	title="AI settings"
	description="AI is optional. Internery works without it; these features only add explanations and suggestions."
/>

{#if data.updated}
	<Alert class="mb-6 border-chalk/30 bg-chalk/5">
		<AlertTitle>AI settings updated</AlertTitle>
		<AlertDescription>The change applies immediately.</AlertDescription>
	</Alert>
{/if}

{#if form?.message}
	<Alert class="mb-6" variant="destructive">
		<AlertTitle>Could not save the change</AlertTitle>
		<AlertDescription>{form.message}</AlertDescription>
	</Alert>
{/if}

<section class="border-t-4 border-chalk bg-card p-6">
	<div class="flex flex-wrap items-center gap-3">
		<Badge
			class={consent.granted ? 'bg-chalk/15 text-chalk' : 'bg-ink/10 text-ink/70'}
			variant="ghost"
		>
			{consent.granted ? 'Consent active' : 'Consent not granted'}
		</Badge>
		<p class="text-sm text-ink/70">
			{consent.granted
				? 'AI may read your CV to explain how it fits a job.'
				: 'Your CV is not sent to the AI provider.'}
		</p>
	</div>

	<dl class="mt-6 grid gap-4 sm:grid-cols-2">
		<div>
			<dt class="text-xs tracking-wide text-ink/50 uppercase">Granted</dt>
			<dd class="mt-1 font-medium">
				{consent.consentedAt ? formatTimestamp(consent.consentedAt) : 'Never'}
			</dd>
		</div>

		<div>
			<dt class="text-xs tracking-wide text-ink/50 uppercase">Withdrawn</dt>
			<dd class="mt-1 font-medium">
				{consent.withdrawnAt ? formatTimestamp(consent.withdrawnAt) : 'Not withdrawn'}
			</dd>
		</div>
	</dl>
</section>

<section class="mt-6 border border-rule bg-card p-6">
	<h2 class="text-lg font-semibold">What is sent</h2>
	<p class="mt-3 max-w-2xl text-sm leading-relaxed text-ink/70">{consent.dataSent}</p>
	<p class="mt-3 max-w-2xl text-sm text-ink/60">
		The CV text is extracted on our server first. Your name, phone number and email are removed
		before anything is sent. The AI provider never receives your file, your account or the job
		database.
	</p>
</section>

<section class="mt-6 border border-rule bg-card p-6">
	<h2 class="text-lg font-semibold">Your choice</h2>

	{#if consent.granted}
		<p class="mt-2 max-w-2xl text-sm text-ink/70">
			Withdrawing stops all CV sharing and deletes the explanations stored for your CV. You can
			grant consent again at any time.
		</p>

		<form id="withdraw-consent" method="POST">
			<input name="granted" type="hidden" value="false" />
			<Button
				class="mt-4"
				onclick={() => (confirmWithdraw = true)}
				type="button"
				variant="destructive"
			>
				Withdraw consent
			</Button>
		</form>

		<ConfirmDialog
			bind:open={confirmWithdraw}
			confirmLabel="Withdraw consent"
			description="This stops CV sharing and deletes the AI explanations stored for your CV. You can grant consent again later."
			destructive
			onconfirm={submitWithdrawal}
			title="Withdraw AI consent?"
		/>
	{:else}
		<p class="mt-2 max-w-2xl text-sm text-ink/70">
			Grant consent to let AI compare your CV with a job and explain the fit. Job suggestions use
			your major and skills, not your CV, so they do not need this consent.
		</p>

		<form method="POST">
			<input name="granted" type="hidden" value="true" />
			<Button class="mt-4" type="submit">Allow AI to read my CV</Button>
		</form>
	{/if}
</section>

<section class="mt-6 border border-rule bg-card p-6">
	<h2 class="text-lg font-semibold">What AI adds</h2>

	<dl class="mt-4 grid gap-5 sm:grid-cols-2">
		<div>
			<dt class="font-medium">Why a job fits</dt>
			<dd class="mt-1 text-sm text-ink/70">
				Compares your CV with one job advert. Every reason must quote a line from your CV, so the
				explanation stays grounded in what you wrote.
			</dd>
		</div>

		<div>
			<dt class="font-medium">Suggested jobs</dt>
			<dd class="mt-1 text-sm text-ink/70">
				Ranks open jobs by your major and skills. Suggestions do not read your CV and work without
				consent.
			</dd>
		</div>
	</dl>

	<Button class="mt-5" href={`${resolve('recommendations')}?tab=ai`} variant="outline">
		See suggested jobs
	</Button>

	<p class="mt-5 text-sm text-ink/60">
		To get the most from AI, keep your <a class="underline" href={resolve('me/profile')}
			>student profile</a
		>
		up to date and upload a text-based PDF or DOCX CV.
	</p>
</section>
