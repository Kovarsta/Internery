<script lang="ts">
	/**
	 * Hero for `/jobs`.
	 *
	 * One page-load reveal, shared by the headline and the supporting line. The animation is
	 * skipped when the visitor prefers reduced motion.
	 */

	import { onMount } from 'svelte';
	import gsap from 'gsap';

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

<section bind:this={root} class="mb-8 border-b border-rule pb-8">
	<h1 data-reveal class="max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
		Find a shift that fits your week.
	</h1>
	<p data-reveal class="mt-4 max-w-xl text-base text-ink/70">
		Part-time work from Hanoi employers, with the dates and pay up front.
	</p>
</section>
