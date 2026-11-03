<script lang="ts">
	/**
	 * Applicant profile (`/employer/jobs/[jobId]/applicants/[applicationId]`).
	 *
	 * Shows the student profile for one application via
	 * `GET /applications/{applicationId}/student-profile`, with the application CV
	 * available for download.
	 */

	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const profile = $derived(data.profile);
	const studies = $derived([profile.university, profile.major].filter((part) => part).join(' · '));
	const backHref = $derived(resolve(`employer/jobs/${encodeURIComponent(data.job.id)}/applicants`));
	const cvHref = $derived(`/api/v1/applications/${page.params.applicationId}/cv`);
</script>

<a class="text-sm font-medium text-chalk hover:underline" href={backHref}>← Back to applicants</a>

<div class="mt-4 flex flex-wrap items-center gap-3">
	<h1 class="text-3xl font-extrabold tracking-tight">{profile.fullName}</h1>
	{#if profile.ratingCount > 0}
		<Badge class="bg-highlight/20 text-ink" variant="ghost">
			{profile.ratingAvg.toFixed(1)} from {profile.ratingCount}
			{profile.ratingCount === 1 ? 'review' : 'reviews'}
		</Badge>
	{:else}
		<Badge class="bg-muted text-muted-foreground" variant="ghost">No reviews yet</Badge>
	{/if}
</div>

<p class="mt-1 text-ink/60">Applicant for {data.job.title}</p>

{#if studies}
	<p class="mt-4 text-lg font-medium">{studies}</p>
{/if}

<section class="mt-8 grid gap-6 border-t border-rule pt-6 sm:grid-cols-2">
	<div>
		<h2 class="text-sm font-semibold">Availability</h2>
		<p class="mt-1 text-ink/70">{profile.availability ?? 'Not set'}</p>
	</div>
	<div>
		<h2 class="text-sm font-semibold">CV</h2>
		{#if profile.cv}
			<a class="mt-1 inline-block text-ink/70 hover:text-chalk" href={cvHref} rel="external">
				{profile.cv.fileName}
			</a>
		{:else}
			<p class="mt-1 text-ink/70">No CV on the profile</p>
		{/if}
	</div>
</section>

{#if profile.skills.length > 0}
	<h2 class="mt-8 text-sm font-semibold">Skills</h2>
	<ul class="mt-2 flex flex-wrap gap-2">
		{#each profile.skills as skill (skill)}
			<li>
				<Badge class="bg-highlight/20 text-ink" variant="ghost">{skill}</Badge>
			</li>
		{/each}
	</ul>
{/if}

{#if profile.bio}
	<h2 class="mt-8 text-sm font-semibold">About</h2>
	<p class="mt-2 max-w-2xl text-ink/70">{profile.bio}</p>
{/if}
