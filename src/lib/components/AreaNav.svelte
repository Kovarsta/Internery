<script lang="ts">
	/**
	 * Section navigation for a signed-in area.
	 *
	 * Renders the links as a small tab bar and marks the current path. The area layout owns the
	 * list; this component only handles the shared appearance and active state.
	 */

	import { page } from '$app/state';
	import type { ResolvedPathname } from '$app/types';

	type Props = {
		label: string;
		links: { href: ResolvedPathname; label: string }[];
	};

	let { label, links }: Props = $props();

	const currentPath = $derived(page.url.pathname);

	/** Shared tab styling, with the current section highlighted. */
	function linkClass(href: string): string {
		const base = 'rounded-md px-3 py-1.5 text-sm';

		return href === currentPath
			? `${base} bg-slate-900 font-medium text-white`
			: `${base} text-slate-600 hover:bg-slate-100 hover:text-slate-900`;
	}
</script>

<nav class="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3" aria-label={label}>
	{#each links as link (link.href)}
		<a
			class={linkClass(link.href)}
			href={link.href}
			aria-current={link.href === currentPath ? 'page' : undefined}
		>
			{link.label}
		</a>
	{/each}
</nav>
