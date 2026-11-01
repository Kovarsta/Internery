<script lang="ts">
	type Props = {
		title: string;
		description?: string;
	};

	let { title, description }: Props = $props();
</script>

<header class="mb-6">
	<h1 class="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
	{#if description}
		<p class="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>
	{/if}
</header>
