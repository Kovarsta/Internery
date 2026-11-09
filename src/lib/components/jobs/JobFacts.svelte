<script lang="ts">
	/**
	 * The shift facts on `/jobs/[jobId]`.
	 *
	 * Keeps the definition list out of the page so the detail route stays a composition.
	 */

	import type { JobDetail } from '#lib/api/types.ts';
	import { formatDateRange, formatSalary } from '#lib/format.ts';

	let { job }: { job: JobDetail } = $props();

	const statusLabel: Record<JobDetail['status'], string> = {
		HIRING: 'Hiring',
		CLOSED: 'Closed',
		FILLED: 'Filled',
		COMPLETED: 'Completed',
		CANCELLED: 'Cancelled'
	};
</script>

<dl class="mt-4 grid gap-5 sm:grid-cols-2">
	<div>
		<dt class="text-sm text-ink/60">Dates</dt>
		<dd class="mt-1 font-medium">{formatDateRange(job.startDate, job.endDate)}</dd>
	</div>
	<div>
		<dt class="text-sm text-ink/60">Schedule</dt>
		<dd class="mt-1 font-medium">{job.schedule}</dd>
		{#if job.scheduleNote}
			<p class="mt-1 text-sm text-ink/60">{job.scheduleNote}</p>
		{/if}
	</div>
	<div>
		<dt class="text-sm text-ink/60">Pay</dt>
		<dd class="mt-1 font-medium">{formatSalary(job.salaryAmount, job.salaryType)}</dd>
	</div>
	<div>
		<dt class="text-sm text-ink/60">Positions</dt>
		<dd class="mt-1 font-medium">
			{job.positionsRemaining} of {job.positionsNeeded} still open
		</dd>
	</div>
	<div>
		<dt class="text-sm text-ink/60">Status</dt>
		<dd class="mt-1 font-medium">{statusLabel[job.status]}</dd>
	</div>
</dl>
