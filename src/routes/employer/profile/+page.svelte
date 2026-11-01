<script lang="ts">
	/**
	 * Company profile (`/employer/profile`).
	 *
	 * Reads and replaces the organisation fields through `GET` and `PUT /me/employer-profile`.
	 * Verification state is owned by the trust flow and is read-only here. Skeleton only.
	 */

	import PageHeader from '#lib/components/PageHeader.svelte';
	import SkeletonNotice from '#lib/components/SkeletonNotice.svelte';
</script>

<PageHeader
	title="Company profile"
	description="Shown on every job you post. Verified employers can filter into verified-only search."
/>

<form class="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
	<div>
		<label class="block text-sm font-medium text-slate-700" for="org-name">Organisation name</label>
		<input
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="org-name"
			name="orgName"
			type="text"
		/>
	</div>

	<div>
		<label class="block text-sm font-medium text-slate-700" for="org-type">Organisation type</label>
		<select
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="org-type"
			name="orgType"
		>
			<option value="COMPANY">Company</option>
			<option value="INDIVIDUAL">Individual</option>
		</select>
	</div>

	<div class="sm:col-span-2">
		<label class="block text-sm font-medium text-slate-700" for="org-description">About</label>
		<textarea
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="org-description"
			name="description"
			rows="4"></textarea>
	</div>

	<div>
		<label class="block text-sm font-medium text-slate-700" for="org-address">Address</label>
		<input
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="org-address"
			name="address"
			type="text"
		/>
	</div>

	<div>
		<label class="block text-sm font-medium text-slate-700" for="org-phone">Contact phone</label>
		<input
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="org-phone"
			name="contactPhone"
			type="tel"
		/>
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
		Company form skeleton. PUT /me/employer-profile is implemented; verification state is read-only
		here.
	</SkeletonNotice>
</div>
