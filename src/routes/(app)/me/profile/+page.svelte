<script lang="ts">
	/**
	 * Student profile (`/me/profile`).
	 *
	 * Reads the profile through `GET /me/student-profile` and saves it with the form action, which
	 * sends `PUT /me/student-profile`. The CV belongs to its own upload flow and is not edited
	 * here.
	 */

	import PageHeader from '#lib/components/PageHeader.svelte';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { Textarea } from '#lib/components/ui/textarea/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const profile = $derived(data.profile);
	const values = $derived(
		form?.values ?? {
			university: profile.university,
			major: profile.major,
			skills: profile.skills.join(', '),
			availability: profile.availability ?? '',
			bio: profile.bio ?? ''
		}
	);
</script>

<PageHeader
	title="Student profile"
	description="Employers see this when you apply. Keep the skills and availability current."
/>

{#if data.saved}
	<Alert class="mb-6 border-chalk/30 bg-chalk/5">
		<AlertTitle>Profile saved</AlertTitle>
		<AlertDescription>New applications use the updated profile.</AlertDescription>
	</Alert>
{/if}

{#if form?.message}
	<Alert class="mb-6" variant="destructive">
		<AlertTitle>Cannot save the profile</AlertTitle>
		<AlertDescription>{form.message}</AlertDescription>
	</Alert>
{/if}

<form class="grid max-w-3xl gap-4 border-t-4 border-chalk bg-card p-6 sm:grid-cols-2" method="POST">
	<div>
		<Label class="mb-1" for="profile-university">University</Label>
		<Input
			id="profile-university"
			maxlength={160}
			name="university"
			required
			value={values.university}
		/>
	</div>

	<div>
		<Label class="mb-1" for="profile-major">Major</Label>
		<Input id="profile-major" maxlength={160} name="major" required value={values.major} />
	</div>

	<div class="sm:col-span-2">
		<Label class="mb-1" for="profile-skills">Skills</Label>
		<Input
			id="profile-skills"
			name="skills"
			placeholder="Customer service, English, Excel"
			value={values.skills}
		/>
		<p class="mt-1 text-sm text-ink/60">Separate skills with commas. Up to 30.</p>
	</div>

	<div class="sm:col-span-2">
		<Label class="mb-1" for="profile-availability">Availability</Label>
		<Input
			id="profile-availability"
			maxlength={500}
			name="availability"
			placeholder="Weekday evenings and weekends"
			value={values.availability}
		/>
	</div>

	<div class="sm:col-span-2">
		<Label class="mb-1" for="profile-bio">About you</Label>
		<Textarea
			class="bg-card"
			id="profile-bio"
			maxlength={2000}
			name="bio"
			rows={5}
			value={values.bio}
		/>
	</div>

	<div class="flex justify-end sm:col-span-2">
		<Button type="submit">Save profile</Button>
	</div>
</form>
