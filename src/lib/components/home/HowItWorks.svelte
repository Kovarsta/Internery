<script lang="ts">
	/**
	 * Three-step explanation of the marketplace.
	 *
	 * The work-record step is the differentiator, so it links to the public
	 * directory where a visitor can check a real signature.
	 */

	import { resolve } from '$app/paths';

	const steps = [
		{
			number: '01',
			title: 'Build your profile once',
			text: 'Add your university, skills and availability. Your CV is attached to every application.'
		},
		{
			number: '02',
			title: 'Apply to shifts that fit',
			text: 'See the dates, schedule and pay before you apply. No guessing what the week looks like.'
		},
		{
			number: '03',
			title: 'Finish and get a signed record',
			text: 'The employer signs the dates and rating. Anyone can check the record on Internery.'
		}
	];
</script>

<section class="mt-12">
	<div class="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-2">
		<h2 class="text-2xl font-bold tracking-tight">How Internery works</h2>
		<a class="text-sm font-medium text-chalk hover:underline" href={resolve('work-records')}>
			See public records
		</a>
	</div>

	<ol class="mt-6 grid gap-6 sm:grid-cols-3">
		{#each steps as step (step.number)}
			<li class="border-t-2 border-chalk pt-4">
				<p class="text-sm font-semibold text-chalk">{step.number}</p>
				<h3 class="mt-2 text-lg font-semibold">{step.title}</h3>
				<p class="mt-2 text-sm leading-relaxed text-ink/70">{step.text}</p>
			</li>
		{/each}
	</ol>
</section>
