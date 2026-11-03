<script lang="ts">
	/**
	 * Employer area layout (`/employer/*`).
	 *
	 * Adds the employer tabs. The role guard lives in `+layout.server.ts`, so only employer
	 * accounts reach this layout.
	 */

	import { resolve } from '$app/paths';
	import AreaNav from '#lib/components/AreaNav.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const links = [
		{ href: resolve('employer/jobs'), label: 'My jobs' },
		{ href: resolve('employer/profile'), label: 'Company profile' }
	];
</script>

<AreaNav label="Employer" {links} />

{@render children()}
