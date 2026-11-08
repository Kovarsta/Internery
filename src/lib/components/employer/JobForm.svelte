<script lang="ts">
	/**
	 * The job fields shared by `/employer/jobs/new` and `/employer/jobs/[jobId]/edit`.
	 *
	 * The component renders inputs only; the page owns the header, the action and the error alert.
	 * Values come back filled in when the API rejects a save.
	 */

	import type { ResolvedPathname } from '$app/types';
	import SearchSelect from '#lib/components/SearchSelect.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { NativeSelect, NativeSelectOption } from '#lib/components/ui/native-select/index.ts';
	import { Textarea } from '#lib/components/ui/textarea/index.ts';
	import type { Category } from '#lib/api/types.ts';
	import type { JobFormValues } from '#lib/job-form.ts';
	import { DAY_OF_WEEK_LABELS, DAY_OF_WEEK_VALUES } from '#lib/schedule.ts';

	type Props = {
		categories: Category[];
		values: JobFormValues;
		submitLabel: string;
		cancelHref: ResolvedPathname;
	};

	let { categories, values, submitLabel, cancelHref }: Props = $props();

	const categoryOptions = $derived(
		categories.map((category) => ({ value: category.id, label: category.name }))
	);
</script>

<form
	class="mt-6 grid max-w-3xl gap-4 border-t-4 border-chalk bg-card p-6 sm:grid-cols-2"
	method="POST"
>
	<div class="sm:col-span-2">
		<Label class="mb-1" for="job-title">Title</Label>
		<Input id="job-title" name="title" required value={values.title} />
	</div>

	<div>
		<Label class="mb-1" for="job-category">Category</Label>
		<SearchSelect
			class="w-full"
			id="job-category"
			items={categoryOptions}
			name="categoryId"
			placeholder="Search categories"
			required
			value={values.categoryId}
		/>
	</div>

	<div>
		<Label class="mb-1" for="job-location">Location</Label>
		<Input id="job-location" name="location" required value={values.location} />
	</div>

	<div class="sm:col-span-2">
		<Label class="mb-1" for="job-description">Description</Label>
		<Textarea
			class="bg-card"
			id="job-description"
			name="description"
			required
			rows={4}
			value={values.description}
		/>
	</div>

	<fieldset class="sm:col-span-2">
		<legend class="mb-2 text-sm font-medium">Working days</legend>
		<div class="flex flex-wrap gap-x-5 gap-y-2">
			{#each DAY_OF_WEEK_VALUES as day (day)}
				<label class="flex items-center gap-2 text-sm">
					<input
						class="size-4 accent-ink"
						type="checkbox"
						name="daysOfWeek"
						value={day}
						checked={values.daysOfWeek.includes(day)}
					/>
					{DAY_OF_WEEK_LABELS[day]}
				</label>
			{/each}
		</div>
	</fieldset>

	<div>
		<Label class="mb-1" for="job-start-time">Start time</Label>
		<Input id="job-start-time" name="startTime" required type="time" value={values.startTime} />
	</div>

	<div>
		<Label class="mb-1" for="job-end-time">End time</Label>
		<Input id="job-end-time" name="endTime" required type="time" value={values.endTime} />
	</div>

	<div class="sm:col-span-2">
		<Label class="mb-1" for="job-schedule-note">Schedule note (optional)</Label>
		<Input
			id="job-schedule-note"
			name="scheduleNote"
			maxlength={300}
			placeholder="Anything else about the hours, for example split shifts"
			value={values.scheduleNote}
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
			value={values.salaryAmount}
		/>
	</div>

	<div>
		<Label class="mb-1" for="job-salary-type">Pay type</Label>
		<NativeSelect class="w-full" id="job-salary-type" name="salaryType" value={values.salaryType}>
			<NativeSelectOption value="HOURLY">Per hour</NativeSelectOption>
			<NativeSelectOption value="DAILY">Per day</NativeSelectOption>
			<NativeSelectOption value="FIXED">Fixed amount</NativeSelectOption>
		</NativeSelect>
	</div>

	<div>
		<Label class="mb-1" for="job-start">Start date</Label>
		<Input id="job-start" name="startDate" required type="date" value={values.startDate} />
	</div>

	<div>
		<Label class="mb-1" for="job-end">End date</Label>
		<Input id="job-end" name="endDate" required type="date" value={values.endDate} />
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
			value={values.positionsNeeded}
		/>
	</div>

	<div class="flex items-end justify-end gap-2 sm:col-span-2">
		<Button href={cancelHref} type="button" variant="ghost">Cancel</Button>
		<Button type="submit">{submitLabel}</Button>
	</div>
</form>
