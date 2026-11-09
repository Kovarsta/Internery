<script lang="ts">
	/**
	 * Hero for `/`.
	 *
	 * The left column pitches the marketplace and offers a keyword search. The
	 * right column shows the top featured shift so a visitor sees a real job
	 * before scrolling. The reveal is skipped when the visitor prefers reduced
	 * motion.
	 */

	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import FeaturedJobCard from '#lib/components/home/FeaturedJobCard.svelte';
	import type { JobSummary } from '#lib/api/types.ts';
	import gsap from 'gsap';

	type Props = {
		isSignedIn: boolean;
		featuredJob: JobSummary | null;
		openShiftCount: number;
	};

	let { isSignedIn, featuredJob, openShiftCount }: Props = $props();

	let root = $state<HTMLElement>();

	onMount(() => {
		if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			return;
		}

		gsap.from(root.querySelectorAll('[data-reveal]'), {
			y: 18,
			opacity: 0,
			duration: 0.5,
			stagger: 0.08,
			ease: 'power2.out'
		});
	});
</script>

<section
	bind:this={root}
	class="grid gap-10 border-b border-rule pb-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
>
	<div>
		<p data-reveal class="text-sm font-semibold tracking-wide text-chalk uppercase">
			Part-time work in Vietnam
		</p>

		<h1 data-reveal class="mt-3 max-w-xl text-4xl font-extrabold tracking-tight sm:text-5xl">
			Find a shift that fits your week.
		</h1>

		<p data-reveal class="mt-4 max-w-xl text-base text-ink/70">
			Real part-time jobs with the dates and pay up front. Apply with your profile, finish the work,
			and keep a signed record you can show anyone.
		</p>

		<form
			data-reveal
			class="mt-7 flex max-w-xl flex-col gap-2 sm:flex-row"
			action={resolve('jobs')}
			method="GET"
		>
			<Input
				aria-label="Search open shifts"
				class="h-10 bg-card"
				name="q"
				placeholder="Barista, tutor, delivery..."
			/>
			<Button class="h-10 shrink-0" type="submit">Search shifts</Button>
		</form>

		<div data-reveal class="mt-4 flex flex-wrap items-center gap-3">
			<a class="text-sm font-medium text-chalk hover:underline" href={resolve('jobs')}>
				{openShiftCount > 0 ? `Browse all ${openShiftCount} open shifts` : 'Browse open shifts'}
			</a>
			{#if isSignedIn}
				<Button href={resolve('me')} size="sm" variant="outline">My account</Button>
			{:else}
				<Button href={resolve('register')} size="sm" variant="outline">Create an account</Button>
			{/if}
		</div>

		<p data-reveal class="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/60">
			<span>Pay and hours up front</span>
			<span>Verified employers</span>
			<span>Signed work records</span>
		</p>
	</div>

	<div data-reveal>
		{#if featuredJob}
			<p class="mb-3 text-sm font-semibold tracking-wide text-chalk uppercase">
				Featured this week
			</p>
			<FeaturedJobCard job={featuredJob} variant="hero" />
		{:else}
			<div class="border-t-4 border-chalk bg-card p-6">
				<h2 class="text-xl font-semibold">New shifts are posted every day.</h2>
				<p class="mt-2 text-sm text-ink/70">Browse the full list to see what is open right now.</p>
				<a
					class="mt-4 inline-block text-sm font-medium text-chalk hover:underline"
					href={resolve('jobs')}
				>
					Browse open shifts
				</a>
			</div>
		{/if}
	</div>
</section>
