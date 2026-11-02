<script lang="ts">
	/**
	 * Admin area layout (`/admin/*`).
	 *
	 * Adds the moderation tabs. The role guard lives in `+layout.server.ts`; the API checks the
	 * admin role again on every operation.
	 */

	import { resolve } from '$app/paths';
	import AreaNav from '#lib/components/AreaNav.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const links = [
		{ href: resolve('/admin'), label: 'Overview' },
		{ href: resolve('/admin/users'), label: 'Users' },
		{ href: resolve('/admin/moderation'), label: 'Moderation' },
		{ href: resolve('/admin/categories'), label: 'Categories' },
		{ href: resolve('/admin/verification'), label: 'Verification' }
	];
</script>

<AreaNav label="Admin" {links} />

{@render children()}
