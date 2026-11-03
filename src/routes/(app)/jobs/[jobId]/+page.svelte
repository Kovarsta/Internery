<script lang="ts">
	/**
	 * Job detail (`/jobs/[jobId]`).
	 *
	 * Shows the shift facts, the description and the employer from `GET /jobs/{jobId}`. The
	 * apply and save controls live in `JobActions`; the page owns layout only.
	 */

	import { resolve } from '$app/paths';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.ts';
	import EmployerPanel from '#lib/components/jobs/EmployerPanel.svelte';
	import JobActions from '#lib/components/jobs/JobActions.svelte';
	import JobFacts from '#lib/components/jobs/JobFacts.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const job = $derived(data.job);
</script>

<a class="text-sm font-medium text-chalk hover:underline" href={resolve('jobs')}>Back to jobs</a>

<header class="mt-4 border-b border-rule pb-6">
	<p class="text-sm text-ink/60">{job.category.name}</p>
	<h1 class="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">{job.title}</h1>
	<p class="mt-3 text-ink/70">{job.employer.orgName}</p>
	<p class="text-sm text-ink/60">{job.location}</p>

	{#if job.scamWarning}
		<Alert class="mt-4 border-warning/40 bg-warning/10" variant="destructive">
			<AlertTitle>Check this listing</AlertTitle>
			<AlertDescription>
				This listing matched a scam keyword. Check the employer before sharing personal details.
			</AlertDescription>
		</Alert>
	{/if}
</header>

<div class="mt-8 grid gap-10 lg:grid-cols-[1fr_19rem]">
	<section>
		<h2 class="text-lg font-semibold">The shift</h2>
		<JobFacts {job} />

		<h2 class="mt-10 text-lg font-semibold">About the job</h2>
		<p class="mt-3 whitespace-pre-line text-ink/80">{job.description}</p>
	</section>

	<aside class="border-t border-rule pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
		<EmployerPanel employer={job.employer} />

		<div class="mt-6 border-t border-rule pt-6">
			<JobActions {job} role={data.user?.role} />
		</div>
	</aside>
</div>
