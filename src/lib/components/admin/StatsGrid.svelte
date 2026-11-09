<script lang="ts">
	/**
	 * Counts for the admin overview (`/admin`).
	 *
	 * Groups the numbers the way an admin thinks about them: people, jobs, and
	 * activity. The range, when set, is shown in the heading so the counts are
	 * never mistaken for all-time values.
	 */

	import type { PlatformStats } from '#lib/api/types.ts';

	let { stats }: { stats: PlatformStats } = $props();

	const people = $derived([
		{ label: 'Students', value: stats.users.students },
		{ label: 'Employers', value: stats.users.employers },
		{ label: 'Admins', value: stats.users.admins }
	]);

	const jobs = $derived([
		{ label: 'Hiring', value: stats.jobs.hiring },
		{ label: 'Closed', value: stats.jobs.closed },
		{ label: 'Filled', value: stats.jobs.filled },
		{ label: 'Completed', value: stats.jobs.completed },
		{ label: 'Cancelled', value: stats.jobs.cancelled }
	]);
</script>

<div class="grid gap-4 lg:grid-cols-3">
	<section class="border-t-4 border-chalk bg-card p-5">
		<h2 class="text-xs tracking-wide text-ink/50 uppercase">People</h2>
		<dl class="mt-3 flex flex-wrap gap-x-6 gap-y-2">
			{#each people as item (item.label)}
				<div>
					<dt class="text-sm text-ink/60">{item.label}</dt>
					<dd class="text-2xl font-semibold">{item.value}</dd>
				</div>
			{/each}
		</dl>
	</section>

	<section class="border-t-4 border-highlight bg-card p-5">
		<h2 class="text-xs tracking-wide text-ink/50 uppercase">Jobs</h2>
		<dl class="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
			{#each jobs as item (item.label)}
				<div>
					<dt class="text-sm text-ink/60">{item.label}</dt>
					<dd class="text-2xl font-semibold">{item.value}</dd>
				</div>
			{/each}
		</dl>
	</section>

	<section class="border-t-4 border-rule bg-card p-5">
		<h2 class="text-xs tracking-wide text-ink/50 uppercase">Activity</h2>
		<dl class="mt-3 flex flex-wrap gap-x-6 gap-y-2">
			<div>
				<dt class="text-sm text-ink/60">Applications</dt>
				<dd class="text-2xl font-semibold">{stats.applicationsTotal}</dd>
			</div>
			<div>
				<dt class="text-sm text-ink/60">Completed jobs</dt>
				<dd class="text-2xl font-semibold">{stats.completedJobs}</dd>
			</div>
		</dl>
	</section>
</div>
