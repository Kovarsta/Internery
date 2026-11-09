<script lang="ts">
	/**
	 * Tabs for one employer job.
	 *
	 * Overview and Applicants always exist; Edit is shown only while the job is
	 * still hiring, matching the API rule.
	 */

	import { resolve } from '$app/paths';
	import AreaNav from '#lib/components/AreaNav.svelte';

	let { jobId, canEdit }: { jobId: string; canEdit: boolean } = $props();

	const encodedId = $derived(encodeURIComponent(jobId));

	// Typed routes need the full literal template; a composed base path widens to `string`.
	const links = $derived([
		{ href: resolve(`employer/jobs/${encodedId}`), label: 'Overview' },
		{ href: resolve(`employer/jobs/${encodedId}/applicants`), label: 'Applicants' },
		...(canEdit ? [{ href: resolve(`employer/jobs/${encodedId}/edit`), label: 'Edit' }] : [])
	]);
</script>

<AreaNav label="Job" {links} />
