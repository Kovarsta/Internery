<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<p class="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
	{@render children()}
</p>
