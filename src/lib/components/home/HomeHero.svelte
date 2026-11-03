<script lang="ts">
	/**
	 * Hero for `/`.
	 *
	 * Sets the tone for the marketplace and offers the two next steps: browse the open shifts, or
	 * create an account. The reveal is skipped when the visitor prefers reduced motion.
	 */

	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button/index.ts';
	import gsap from 'gsap';

	let { isSignedIn }: { isSignedIn: boolean } = $props();

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

<section bind:this={root} class="border-b border-rule pb-10">
	<p data-reveal class="text-sm font-semibold tracking-wide text-chalk uppercase">
		Part-time work in Vietnam
	</p>

	<h1 data-reveal class="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
		Find a shift that fits your week.
	</h1>

	<p data-reveal class="mt-4 max-w-xl text-base text-ink/70">
		Student jobs from Hanoi employers, with the dates and pay up front. Finish the work and the
		employer signs a record you can show anyone.
	</p>

	<div data-reveal class="mt-7 flex flex-wrap items-center gap-3">
		<Button href={resolve('jobs')} size="lg">Browse open shifts</Button>
		{#if isSignedIn}
			<Button href={resolve('me')} size="lg" variant="outline">My account</Button>
		{:else}
			<Button href={resolve('register')} size="lg" variant="outline">Create an account</Button>
		{/if}
	</div>
</section>
