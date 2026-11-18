<script lang="ts">
	/**
	 * “Why this fits” panel for a job page.
	 *
	 * The request runs in the browser on demand, not during the page load: it can
	 * take up to 15 seconds and it spends one of the student's ten daily AI calls.
	 * Loading a job page should never cost either.
	 *
	 * The API is the source of truth for the three prerequisites, so the panel
	 * does not guess them. It reacts to the error code instead:
	 *
	 * - `AI_CONSENT_REQUIRED` → link to the consent page
	 * - `CV_UNREADABLE` → link to the profile, where the CV is uploaded
	 * - `AI_RATE_LIMITED` → today's budget is spent
	 */

	import { resolve } from '$app/paths';
	import { apiGetJson } from '#lib/api/browser.ts';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import type { AiFit, AiVerdict } from '#lib/api/types.ts';

	let { jobId }: { jobId: string } = $props();

	type PanelState =
		| { name: 'idle' }
		| { name: 'loading' }
		| { name: 'ready'; fit: AiFit }
		| { name: 'error'; code: string | null; message: string };

	let state = $state<PanelState>({ name: 'idle' });

	const verdictLabel: Record<AiVerdict, string> = {
		FIT: 'Good fit',
		MAYBE_FIT: 'Maybe a fit'
	};

	const verdictHint: Record<AiVerdict, string> = {
		FIT: 'Your CV already shows most of what this job asks for.',
		MAYBE_FIT: 'Your CV shows some of what this job asks for. Check the gaps.'
	};

	async function explainFit() {
		state = { name: 'loading' };

		const result = await apiGetJson<AiFit>(`/api/v1/jobs/${jobId}/ai/fit`);

		if (!result.ok) {
			state = { name: 'error', code: result.code, message: result.message };
			return;
		}

		if (result.data) {
			state = { name: 'ready', fit: result.data };
		}
	}
</script>

<section class="mt-6 border-t border-rule pt-6">
	<h2 class="text-lg font-semibold">Why this fits</h2>

	{#if state.name === 'idle'}
		<p class="mt-2 text-sm text-ink/70">
			AI can compare your CV with this advert and quote the parts that match. It reads your CV once
			and keeps the answer, so asking again is instant.
		</p>

		<Button class="mt-3 w-full" onclick={explainFit} type="button" variant="outline">
			Check my CV against this job
		</Button>
	{:else if state.name === 'loading'}
		<p class="mt-2 text-sm text-ink/70">
			Reading your CV and the advert. This can take up to 15 seconds.
		</p>

		<Button class="mt-3 w-full" disabled type="button" variant="outline">Working.</Button>
	{:else if state.name === 'ready'}
		<div class="mt-3 flex flex-wrap items-center gap-2">
			<Badge
				class={state.fit.verdict === 'FIT' ? 'bg-chalk/15 text-chalk' : 'bg-ink/10 text-ink/70'}
				variant="ghost"
			>
				{verdictLabel[state.fit.verdict]}
			</Badge>
			{#if state.fit.cached}
				<span class="text-xs text-ink/50">Saved answer</span>
			{/if}
		</div>

		<p class="mt-2 text-sm text-ink/70">{verdictHint[state.fit.verdict]}</p>

		{#if state.fit.reasons.length > 0}
			<ul class="mt-4 space-y-3">
				{#each state.fit.reasons as reason (reason.cvQuote)}
					<li class="border-l-2 border-chalk/40 pl-3">
						<p class="text-sm text-ink/80">{reason.text}</p>
						<p class="mt-1 text-xs text-ink/55 italic">“{reason.cvQuote}”</p>
					</li>
				{/each}
			</ul>
		{/if}

		{#if state.fit.gaps.length > 0}
			<div class="mt-5">
				<h3 class="text-sm font-medium">What the advert asks for that your CV does not show</h3>
				<ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-ink/70">
					{#each state.fit.gaps as gap (gap)}
						<li>{gap}</li>
					{/each}
				</ul>
			</div>
		{/if}

		<p class="mt-4 text-xs text-ink/50">
			Written by {state.fit.model} from your CV and this advert. It is a guide, not a decision.
		</p>
	{:else}
		<Alert class="mt-3" variant="destructive">
			<AlertTitle>Could not check your CV</AlertTitle>
			<AlertDescription>
				{#if state.code === 'AI_CONSENT_REQUIRED'}
					AI needs your permission before it can read your CV.
					<a class="underline" href={resolve('me/ai')}>Allow AI to read my CV</a>.
				{:else if state.code === 'CV_UNREADABLE'}
					We could not read your CV. Upload a text-based PDF or DOCX from your
					<a class="underline" href={resolve('me/profile')}>student profile</a>.
				{:else if state.code === 'AI_RATE_LIMITED'}
					You have used today's AI limit. Try again tomorrow.
				{:else}
					{state.message}
				{/if}
			</AlertDescription>
		</Alert>

		<Button class="mt-3 w-full" onclick={explainFit} type="button" variant="outline">
			Try again
		</Button>
	{/if}
</section>
