<script lang="ts">
	/**
	 * Page header used by every route page.
	 *
	 * Renders the page title and an optional one-line description. Keep the copy short: it is the
	 * first thing a student or employer reads on the page.
	 */

	type Props = {
		title: string;
		description?: string;
	};

	let { title, description }: Props = $props();
</script>

<header class="mb-6">
	<h1 class="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
	{#if description}
		<p class="mt-1 max-w-2xl text-sm text-ink/70">{description}</p>
	{/if}
</header>
