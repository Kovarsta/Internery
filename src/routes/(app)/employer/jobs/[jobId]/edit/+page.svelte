<script lang="ts">
	/**
	 * Edit a job (`/employer/jobs/[jobId]/edit`).
	 *
	 * The action sends `PATCH /jobs/{jobId}` while the job is hiring. A rejected payload comes back
	 * with the values still filled in.
	 */

	import { resolve } from '$app/paths';
	import EmployerJobTabs from '#lib/components/employer/EmployerJobTabs.svelte';
	import JobForm from '#lib/components/employer/JobForm.svelte';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const values = $derived(form?.values ?? data.values);
</script>

<h1 class="text-3xl font-extrabold tracking-tight">Edit job</h1>
<p class="mt-2 text-ink/70">
	Changes apply to the public listing immediately. Only hiring jobs can be edited.
</p>

{#if form?.message}
	<Alert class="mt-5 max-w-3xl" variant="destructive">
		<AlertTitle>Cannot save the job</AlertTitle>
		<AlertDescription>{form.message}</AlertDescription>
	</Alert>
{/if}

<div class="mt-6">
	<EmployerJobTabs canEdit jobId={data.job.id} />
</div>

<JobForm
	cancelHref={resolve(`employer/jobs/${encodeURIComponent(data.job.id)}`)}
	categories={data.categories}
	submitLabel="Save job"
	{values}
/>
