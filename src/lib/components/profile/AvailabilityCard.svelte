<script lang="ts">
	/**
	 * Free time and the matching-jobs email (`/me/profile`).
	 *
	 * Its own form and its own save action, because these fields drive the
	 * recommendations page and the weekly email. It sits above the profile
	 * details so it is the first thing a student sees.
	 */

	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Checkbox } from '#lib/components/ui/checkbox/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import {
		DAY_OF_WEEK_LABELS,
		DAY_OF_WEEK_VALUES,
		TIME_OF_DAY_LABELS,
		TIME_OF_DAY_VALUES
	} from '#lib/schedule.ts';
	import type { DayOfWeek, TimeOfDay } from '#lib/schedule.ts';

	type Props = {
		days: DayOfWeek[];
		timeOfDay: TimeOfDay[];
		notes: string;
		digestEnabled: boolean;
	};

	let { days, timeOfDay, notes, digestEnabled }: Props = $props();

	const hasAvailability = $derived(days.length > 0 || timeOfDay.length > 0);
</script>

<form
	class="mb-6 max-w-3xl border-2 border-chalk/40 bg-chalk/5 p-6"
	method="POST"
	action="?/availability"
	id="availability"
>
	<div class="flex flex-wrap items-baseline justify-between gap-2">
		<h2 class="text-xl font-semibold">When are you free?</h2>
		{#if hasAvailability}
			<a class="text-sm font-medium text-chalk hover:underline" href={resolve('recommendations')}>
				See matching jobs
			</a>
		{/if}
	</div>

	<p class="mt-2 max-w-2xl text-sm text-ink/70">
		Pick the days and blocks you can work. They power the Fits my week list, and we can email you
		when a new shift matches.
	</p>

	<fieldset class="mt-5">
		<legend class="text-sm font-medium">Days</legend>
		<div class="mt-2 flex flex-wrap gap-x-4 gap-y-2">
			{#each DAY_OF_WEEK_VALUES as day (day)}
				<div class="flex items-center gap-2">
					<Checkbox
						checked={days.includes(day)}
						id={`availability-day-${day}`}
						name="availableDay"
						value={day}
					/>
					<Label for={`availability-day-${day}`}>{DAY_OF_WEEK_LABELS[day]}</Label>
				</div>
			{/each}
		</div>
	</fieldset>

	<fieldset class="mt-4">
		<legend class="text-sm font-medium">Time of day</legend>
		<div class="mt-2 flex flex-wrap gap-x-4 gap-y-2">
			{#each TIME_OF_DAY_VALUES as slot (slot)}
				<div class="flex items-center gap-2">
					<Checkbox
						checked={timeOfDay.includes(slot)}
						id={`availability-time-${slot}`}
						name="availableTimeOfDay"
						value={slot}
					/>
					<Label for={`availability-time-${slot}`}>{TIME_OF_DAY_LABELS[slot]}</Label>
				</div>
			{/each}
		</div>
		<p class="mt-2 text-xs text-ink/60">
			Morning is 05:00-12:00, afternoon 12:00-18:00, evening 18:00-22:00. Leave both empty if you
			have no preference.
		</p>
	</fieldset>

	<div class="mt-4 max-w-xl">
		<Label class="mb-1" for="availability-notes">Anything else about your schedule</Label>
		<Input
			id="availability-notes"
			maxlength={500}
			name="availability"
			placeholder="Weekday evenings and weekends"
			value={notes}
		/>
	</div>

	<div class="mt-5 flex items-start gap-2 border-t border-chalk/20 pt-4">
		<Checkbox checked={digestEnabled} id="availability-digest" name="digestEnabled" value="true" />
		<div>
			<Label for="availability-digest">Email me new jobs that fit my week</Label>
			<p class="mt-0.5 text-xs text-ink/60">
				At most one email a week, and only when a new shift actually matches.
			</p>
		</div>
	</div>

	<div class="mt-5">
		<Button type="submit">Save my free time</Button>
	</div>
</form>
