<script lang="ts">
	/**
	 * Post a job (`/employer/jobs/new`).
	 *
	 * Posts to `+page.server.ts`, which sends the job to `POST /jobs`. Categories
	 * come from `GET /categories`. A rejected payload comes back with the values
	 * still filled in.
	 */

	import { resolve } from '$app/paths';
	import JobForm from '#lib/components/employer/JobForm.svelte';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.ts';
	import { emptyJobFormValues } from '#lib/job-form.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const values = $derived(form?.values ?? emptyJobFormValues);
</script>

<h1 class="text-3xl font-extrabold tracking-tight">Post a job</h1>
<p class="mt-2 text-ink/70">
	Jobs appear in search immediately. Suspicious keywords only flag the listing for review.
</p>

{#if form?.message}
	<Alert class="mt-5 max-w-3xl" variant="destructive">
		<AlertTitle>Cannot publish the job</AlertTitle>
		<AlertDescription>{form.message}</AlertDescription>
	</Alert>
{/if}

<JobForm
	cancelHref={resolve('employer/jobs')}
	categories={data.categories}
	submitLabel="Publish job"
	{values}
/>
