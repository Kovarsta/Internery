<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SkeletonNotice from '#lib/components/SkeletonNotice.svelte';
</script>

<PageHeader
	title="Student profile"
	description="Employers see this when you apply. Keep the skills and availability current."
/>

<form class="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
	<div>
		<label class="block text-sm font-medium text-slate-700" for="profile-university"
			>University</label
		>
		<input
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="profile-university"
			name="university"
			type="text"
		/>
	</div>

	<div>
		<label class="block text-sm font-medium text-slate-700" for="profile-major">Major</label>
		<input
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="profile-major"
			name="major"
			type="text"
		/>
	</div>

	<div class="sm:col-span-2">
		<label class="block text-sm font-medium text-slate-700" for="profile-skills">Skills</label>
		<input
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="profile-skills"
			name="skills"
			placeholder="Customer service, English, Excel"
			type="text"
		/>
	</div>

	<div class="sm:col-span-2">
		<label class="block text-sm font-medium text-slate-700" for="profile-availability">
			Availability
		</label>
		<input
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="profile-availability"
			name="availability"
			type="text"
		/>
	</div>

	<div class="sm:col-span-2">
		<label class="block text-sm font-medium text-slate-700" for="profile-bio">About you</label>
		<textarea
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="profile-bio"
			name="bio"
			rows="4"></textarea>
	</div>

	<div class="sm:col-span-2">
		<button
			class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
			disabled
			type="button"
		>
			Save profile
		</button>
	</div>
</form>

<div class="mt-4">
	<SkeletonNotice>
		Profile form skeleton. CV upload arrives with the storage phase; PUT /me/student-profile is
		already implemented.
	</SkeletonNotice>
</div>
