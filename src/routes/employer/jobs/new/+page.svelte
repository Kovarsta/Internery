<script lang="ts">
	/**
	 * Post a job (`/employer/jobs/new`).
	 *
	 * Posts to `+page.server.ts`, which sends the job to `POST /jobs`. Categories
	 * come from `GET /categories`. A rejected payload comes back with the values
	 * still filled in.
	 */

	import { resolve } from '$app/paths';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { NativeSelect, NativeSelectOption } from '#lib/components/ui/native-select/index.ts';
	import { Textarea } from '#lib/components/ui/textarea/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
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

<form
	class="mt-6 grid max-w-3xl gap-4 border-t-4 border-chalk bg-card p-6 sm:grid-cols-2"
	method="POST"
>
	<div class="sm:col-span-2">
		<Label class="mb-1" for="job-title">Title</Label>
		<Input id="job-title" name="title" required value={form?.values?.title ?? ''} />
	</div>

	<div>
		<Label class="mb-1" for="job-category">Category</Label>
		<NativeSelect
			class="w-full"
			id="job-category"
			name="categoryId"
			required
			value={form?.values?.categoryId ?? ''}
		>
			<NativeSelectOption value="">Choose a category</NativeSelectOption>
			{#each data.categories as category (category.id)}
				<NativeSelectOption value={category.id}>{category.name}</NativeSelectOption>
			{/each}
		</NativeSelect>
	</div>

	<div>
		<Label class="mb-1" for="job-location">Location</Label>
		<Input id="job-location" name="location" required value={form?.values?.location ?? ''} />
	</div>

	<div class="sm:col-span-2">
		<Label class="mb-1" for="job-description">Description</Label>
		<Textarea
			class="bg-card"
			id="job-description"
			name="description"
			required
			rows={4}
			value={form?.values?.description ?? ''}
		/>
	</div>

	<div class="sm:col-span-2">
		<Label class="mb-1" for="job-schedule">Schedule</Label>
		<Input
			id="job-schedule"
			name="schedule"
			placeholder="Saturday and Sunday, 08:00–12:00"
			required
			value={form?.values?.schedule ?? ''}
		/>
	</div>

	<div>
		<Label class="mb-1" for="job-salary">Pay (VND)</Label>
		<Input
			id="job-salary"
			min="1"
			name="salaryAmount"
			required
			step="1"
			type="number"
			value={form?.values?.salaryAmount ?? ''}
		/>
	</div>

	<div>
		<Label class="mb-1" for="job-salary-type">Pay type</Label>
		<NativeSelect
			class="w-full"
			id="job-salary-type"
			name="salaryType"
			value={form?.values?.salaryType ?? 'HOURLY'}
		>
			<NativeSelectOption value="HOURLY">Per hour</NativeSelectOption>
			<NativeSelectOption value="DAILY">Per day</NativeSelectOption>
			<NativeSelectOption value="FIXED">Fixed amount</NativeSelectOption>
		</NativeSelect>
	</div>

	<div>
		<Label class="mb-1" for="job-start">Start date</Label>
		<Input
			id="job-start"
			name="startDate"
			required
			type="date"
			value={form?.values?.startDate ?? ''}
		/>
	</div>

	<div>
		<Label class="mb-1" for="job-end">End date</Label>
		<Input id="job-end" name="endDate" required type="date" value={form?.values?.endDate ?? ''} />
	</div>

	<div>
		<Label class="mb-1" for="job-positions">Positions needed</Label>
		<Input
			id="job-positions"
			min="1"
			name="positionsNeeded"
			required
			step="1"
			type="number"
			value={form?.values?.positionsNeeded ?? '1'}
		/>
	</div>

	<div class="flex items-end justify-end gap-2 sm:col-span-2">
		<Button href={resolve('/employer/jobs')} type="button" variant="ghost">Cancel</Button>
		<Button type="submit">Publish job</Button>
	</div>
</form>
