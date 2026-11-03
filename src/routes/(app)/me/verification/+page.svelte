<script lang="ts">
	/**
	 * Employer verification (`/me/verification`).
	 *
	 * Shows the badge state from `GET /me/employer-profile` and the latest request from
	 * `GET /me/verification-request`. The form submits `POST /me/verification-request` through a
	 * server action, which forwards the multipart body so the optional licence can travel with it.
	 */

	import PageHeader from '#lib/components/PageHeader.svelte';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import type { EmployerVerification } from '#lib/api/types.ts';
	import { formatTimestamp } from '#lib/format.ts';
	import { verificationStatusClass, verificationStatusLabel } from '#lib/labels.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const profile = $derived(data.profile);
	const request = $derived(data.request);

	const statusSummary: Record<EmployerVerification, string> = {
		UNVERIFIED: 'No verification request has been approved for this company yet.',
		PENDING: 'An admin is reviewing your latest request.',
		VERIFIED: 'Your organisation is verified and your jobs show the badge.',
		REJECTED: 'Your latest request was rejected. The reason is shown below.'
	};

	const canSubmit = $derived(
		profile.verificationStatus !== 'VERIFIED' && profile.verificationStatus !== 'PENDING'
	);

	const values = $derived(
		form?.values ?? {
			orgName: profile.orgName || request?.orgName || '',
			contactInfo: request?.contactInfo ?? '',
			websiteUrl: request?.websiteUrl ?? ''
		}
	);
</script>

<PageHeader
	title="Employer verification"
	description="The Verified badge tells students that an admin has checked your organisation."
/>

{#if data.submitted}
	<Alert class="mb-6 border-chalk/30 bg-chalk/5">
		<AlertTitle>Request submitted</AlertTitle>
		<AlertDescription>An admin will review it. The result appears on this page.</AlertDescription>
	</Alert>
{/if}

{#if form?.message}
	<Alert class="mb-6" variant="destructive">
		<AlertTitle>Cannot submit the request</AlertTitle>
		<AlertDescription>{form.message}</AlertDescription>
	</Alert>
{/if}

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

	{#if canSubmit}
		<p class="mt-2 max-w-xl text-sm text-ink/70">
			Send your organisation name, a contact, an optional website and an optional business licence
			(PDF, PNG or JPEG, up to 5 MB). An admin checks the details before approving.
		</p>

		<form
			class="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2"
			enctype="multipart/form-data"
			method="POST"
		>
			<div>
				<Label class="mb-1" for="verification-org-name">Organisation name</Label>
				<Input
					id="verification-org-name"
					maxlength={200}
					name="orgName"
					required
					value={values.orgName}
				/>
			</div>

			<div>
				<Label class="mb-1" for="verification-contact">Contact</Label>
				<Input
					id="verification-contact"
					maxlength={300}
					name="contactInfo"
					placeholder="Name, phone or email the admin can reach"
					required
					value={values.contactInfo}
				/>
			</div>

			<div class="sm:col-span-2">
				<Label class="mb-1" for="verification-website">Website (optional)</Label>
				<Input
					id="verification-website"
					maxlength={500}
					name="websiteUrl"
					placeholder="https://example.com"
					type="url"
					value={values.websiteUrl}
				/>
			</div>

			<div class="sm:col-span-2">
				<Label class="mb-1" for="verification-license">Business licence (optional)</Label>
				<Input
					accept=".pdf,.png,.jpg,.jpeg"
					class="bg-card"
					id="verification-license"
					name="license"
					type="file"
				/>
				<p class="mt-1 text-xs text-ink/60">PDF, PNG or JPEG, up to 5 MB.</p>
			</div>

			<div class="sm:col-span-2">
				<Button type="submit">Submit for review</Button>
			</div>
		</form>
	{:else if profile.verificationStatus === 'VERIFIED'}
		<p class="mt-2 max-w-xl text-sm text-ink/70">
			Your organisation is already verified. The badge stays on your jobs, so there is nothing to
			submit.
		</p>
	{:else}
		<p class="mt-2 max-w-xl text-sm text-ink/70">
			A request is waiting for review. You can submit again if an admin rejects it.
		</p>
	{/if}
</section>
