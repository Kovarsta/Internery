<script lang="ts">
	/**
	 * Employer summary on `/jobs/[jobId]`.
	 *
	 * Shows only what the job detail already carries; no extra request is made.
	 * The description, address and contact phone come from the employer profile
	 * and are publicly visible, the same way the organisation name is.
	 */

	import type { JobDetail } from '#lib/api/types.ts';

	let {
		employer,
		description,
		address,
		contactPhone
	}: {
		employer: JobDetail['employer'];
		description: string | null;
		address: string | null;
		contactPhone: string | null;
	} = $props();
</script>

<h2 class="text-sm font-semibold">Employer</h2>
<p class="mt-2 text-lg font-semibold">{employer.orgName}</p>
<p class="text-sm text-ink/60">
	{employer.orgType === 'COMPANY' ? 'Company' : 'Individual'}
</p>

{#if employer.verified}
	<p class="mt-1 text-sm font-medium text-chalk">Verified employer</p>
{/if}

{#if employer.ratingCount > 0}
	<p class="mt-1 text-sm text-ink/60">
		{employer.ratingAvg.toFixed(1)} from {employer.ratingCount}
		{employer.ratingCount === 1 ? 'review' : 'reviews'}
	</p>
{/if}

{#if description}
	<p class="mt-3 text-sm leading-relaxed whitespace-pre-line text-ink/70">{description}</p>
{/if}

{#if address || contactPhone}
	<dl class="mt-4 space-y-2 border-t border-rule pt-3 text-sm">
		{#if address}
			<div>
				<dt class="text-xs tracking-wide text-ink/50 uppercase">Address</dt>
				<dd class="mt-0.5 text-ink/80">{address}</dd>
			</div>
		{/if}

		{#if contactPhone}
			<div>
				<dt class="text-xs tracking-wide text-ink/50 uppercase">Phone</dt>
				<dd class="mt-0.5 text-ink/80">{contactPhone}</dd>
			</div>
		{/if}
	</dl>
{/if}
