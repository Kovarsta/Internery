<script lang="ts">
	/**
	 * Employer summary on `/jobs/[jobId]`.
	 *
	 * Shows only what the job detail already carries; no extra request is made.
	 */

	import type { JobDetail } from '#lib/api/types.ts';

	let { employer }: { employer: JobDetail['employer'] } = $props();
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
