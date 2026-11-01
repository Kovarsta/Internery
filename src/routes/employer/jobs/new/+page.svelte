<script lang="ts">
	/**
	 * Post a job (`/employer/jobs/new`).
	 *
	 * Serves `POST /jobs`; the category list comes from `GET /categories`. The server validates
	 * the date range, requires an active category, and flags scam keywords. Skeleton only.
	 */

	import PageHeader from '#lib/components/PageHeader.svelte';
	import SkeletonNotice from '#lib/components/SkeletonNotice.svelte';
</script>

<PageHeader
	title="Post a job"
	description="Jobs appear in search immediately. Suspicious keywords only flag the job for review."
/>

<form class="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
	<div class="sm:col-span-2">
		<label class="block text-sm font-medium text-slate-700" for="job-title">Title</label>
		<input
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="job-title"
			name="title"
			type="text"
		/>
	</div>

	<div>
		<label class="block text-sm font-medium text-slate-700" for="job-category">Category</label>
		<select
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="job-category"
			name="categoryId"
		>
			<option value="">Choose a category</option>
		</select>
	</div>

	<div>
		<label class="block text-sm font-medium text-slate-700" for="job-location">Location</label>
		<input
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="job-location"
			name="location"
			type="text"
		/>
	</div>

	<div class="sm:col-span-2">
		<label class="block text-sm font-medium text-slate-700" for="job-description">Description</label
		>
		<textarea
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="job-description"
			name="description"
			rows="4"></textarea>
	</div>

	<div class="sm:col-span-2">
		<label class="block text-sm font-medium text-slate-700" for="job-schedule">Schedule</label>
		<input
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="job-schedule"
			name="schedule"
			type="text"
		/>
	</div>

	<div>
		<label class="block text-sm font-medium text-slate-700" for="job-salary">Pay (VND)</label>
		<input
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="job-salary"
			min="1"
			name="salaryAmount"
			type="number"
		/>
	</div>

	<div>
		<label class="block text-sm font-medium text-slate-700" for="job-salary-type">Pay type</label>
		<select
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="job-salary-type"
			name="salaryType"
		>
			<option value="HOURLY">Per hour</option>
			<option value="DAILY">Per day</option>
			<option value="FIXED">Fixed amount</option>
		</select>
	</div>

	<div>
		<label class="block text-sm font-medium text-slate-700" for="job-start">Start date</label>
		<input
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="job-start"
			name="startDate"
			type="date"
		/>
	</div>

	<div>
		<label class="block text-sm font-medium text-slate-700" for="job-end">End date</label>
		<input
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="job-end"
			name="endDate"
			type="date"
		/>
	</div>

	<div>
		<label class="block text-sm font-medium text-slate-700" for="job-positions">
			Positions needed
		</label>
		<input
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="job-positions"
			min="1"
			name="positionsNeeded"
			type="number"
			value="1"
		/>
	</div>

	<div class="sm:col-span-2">
		<button
			class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
			disabled
			type="button"
		>
			Publish job
		</button>
	</div>
</form>

<div class="mt-4">
	<SkeletonNotice>
		Job form skeleton. POST /jobs validates the fields and flags scam keywords server-side.
	</SkeletonNotice>
</div>
