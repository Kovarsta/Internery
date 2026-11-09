<script lang="ts">
	/**
	 * Password field with a show/hide toggle.
	 *
	 * The toggle is a real button, not part of the input, so it cannot submit the
	 * form. The input still submits by `name`; callers keep their existing labels.
	 */

	import { RiEyeLine, RiEyeOffLine } from 'remixicon-svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { Input } from '#lib/components/ui/input/index.ts';

	type Props = {
		id: string;
		name: string;
		label?: string;
		value?: string;
		autocomplete?: HTMLInputAttributes['autocomplete'];
		required?: boolean;
		minlength?: number;
	};

	let {
		id,
		name,
		label = 'password',
		value,
		autocomplete,
		required = false,
		minlength
	}: Props = $props();

	let isVisible = $state(false);
</script>

<div class="relative">
	<Input
		{autocomplete}
		class="pr-10"
		{id}
		{minlength}
		{name}
		{required}
		type={isVisible ? 'text' : 'password'}
		{value}
	/>

	<button
		aria-label={isVisible ? `Hide ${label}` : `Show ${label}`}
		aria-pressed={isVisible}
		class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink/50 hover:text-ink focus-visible:text-ink focus-visible:outline-none"
		onclick={() => (isVisible = !isVisible)}
		type="button"
	>
		{#if isVisible}
			<RiEyeOffLine aria-hidden="true" class="size-4" />
		{:else}
			<RiEyeLine aria-hidden="true" class="size-4" />
		{/if}
	</button>
</div>
