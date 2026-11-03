<script lang="ts">
	/**
	 * Employer verification (`/me/verification`).
	 *
	 * Shows the badge state from `GET /me/employer-profile` and the latest request from
	 * `GET /me/verification-request`. Submitting a request needs `POST /me/verification-request`,
	 * which is not implemented yet, so the control stays disabled.
	 */

	import PageHeader from '#lib/components/PageHeader.svelte';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import type { EmployerVerification } from '#lib/api/types.ts';
	import { formatTimestamp } from '#lib/format.ts';
	import { verificationStatusClass, verificationStatusLabel } from '#lib/labels.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const profile = $derived(data.profile);
	const request = $derived(data.request);

	const statusSummary: Record<EmployerVerification, string> = {
		UNVERIFIED: 'No verification request has been approved for this company yet.',
		PENDING: 'An admin is reviewing your latest request.',
		VERIFIED: 'Your organisation is verified and your jobs show the badge.',
		REJECTED: 'Your latest request was rejected. The reason is shown below.'
	};
</script>

<PageHeader
	title="Employer verification"
	description="The Verified badge tells students that an admin has checked your organisation."
/>

<section class="border-t-4 border-chalk bg-card p-6">
	<div class="flex flex-wrap items-center gap-3">
		<Badge class={verificationStatusClass[profile.verificationStatus]} variant="ghost">
			{verificationStatusLabel[profile.verificationStatus]}
		</Badge>
		<p class="text-sm text-ink/70">{statusSummary[profile.verificationStatus]}</p>
	</div>

	<p class="mt-3 text-sm text-ink/60">
		{profile.orgName || 'Your organisation'} · {profile.ratingCount}
		{profile.ratingCount === 1 ? 'review' : 'reviews'}
	</p>
</section>

{#if request}
	<section class="mt-6 border border-rule bg-card p-6">
		<h2 class="text-lg font-semibold">Latest request</h2>

		<dl class="mt-4 grid gap-4 sm:grid-cols-2">
			<div>
				<dt class="text-xs tracking-wide text-ink/50 uppercase">Organisation</dt>
				<dd class="mt-1 font-medium">{request.orgName}</dd>
			</div>

			<div>
				<dt class="text-xs tracking-wide text-ink/50 uppercase">Contact</dt>
				<dd class="mt-1 font-medium">{request.contactInfo}</dd>
			</div>

			{#if request.websiteUrl}
				<div>
					<dt class="text-xs tracking-wide text-ink/50 uppercase">Website</dt>
					<dd class="mt-1 truncate font-medium">{request.websiteUrl}</dd>
				</div>
			{/if}

			<div>
				<dt class="text-xs tracking-wide text-ink/50 uppercase">Business licence</dt>
				<dd class="mt-1 font-medium">{request.hasLicense ? 'Attached' : 'Not attached'}</dd>
			</div>

			<div>
				<dt class="text-xs tracking-wide text-ink/50 uppercase">Submitted</dt>
				<dd class="mt-1 font-medium">{formatTimestamp(request.createdAt)}</dd>
			</div>

			{#if request.reviewedAt}
				<div>
					<dt class="text-xs tracking-wide text-ink/50 uppercase">Reviewed</dt>
					<dd class="mt-1 font-medium">{formatTimestamp(request.reviewedAt)}</dd>
				</div>
			{/if}
		</dl>

		{#if request.status === 'REJECTED' && request.rejectReason}
			<Alert class="mt-5" variant="destructive">
				<AlertTitle>Why the request was rejected</AlertTitle>
				<AlertDescription>{request.rejectReason}</AlertDescription>
			</Alert>
		{/if}
	</section>
{:else}
	<p class="mt-6 text-sm text-ink/60">You have not submitted a verification request yet.</p>
{/if}

<section class="mt-6 border border-rule bg-card p-6">
	<h2 class="text-lg font-semibold">Request the badge</h2>
	<p class="mt-2 max-w-xl text-sm text-ink/70">
		A request records your organisation name, a contact, an optional website and an optional
		business licence. Submitting requests is not open yet, so this control stays disabled.
	</p>

	<Button class="mt-4" disabled>Request verification</Button>
</section>
