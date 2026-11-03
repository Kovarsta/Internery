<script lang="ts">
	/**
	 * Empty result state for list pages.
	 *
	 * Says what is missing and offers the next action instead of leaving a blank area.
	 */

	type Props = {
		title: string;
		description: string;
		actionLabel?: string;
		actionHref?: string;
	};

	let { title, description, actionLabel, actionHref }: Props = $props();
</script>

<div class="py-12 text-center">
	<p class="text-lg font-semibold">{title}</p>
	<p class="mx-auto mt-2 max-w-md text-sm text-ink/60">{description}</p>
	{#if actionLabel && actionHref}
		<a class="mt-4 inline-block text-sm font-medium text-chalk hover:underline" href={actionHref}>
			{actionLabel}
		</a>
	{/if}
</div>
