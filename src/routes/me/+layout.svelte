<script lang="ts">
	/**
	 * Account area layout (`/me/*`).
	 *
	 * Adds the section tabs shared by the account pages. The session guard lives in
	 * `+layout.server.ts`; the root layout has already loaded the user.
	 */

	import { resolve } from '$app/paths';
	import AreaNav from '#lib/components/AreaNav.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const links = [
		{ href: resolve('/me'), label: 'Overview' },
		{ href: resolve('/me/profile'), label: 'Student profile' },
		{ href: resolve('/me/applications'), label: 'Applications' },
		{ href: resolve('/me/saved-jobs'), label: 'Saved jobs' },
		{ href: resolve('/me/notifications'), label: 'Notifications' },
		{ href: resolve('/me/verification'), label: 'Verification' },
		{ href: resolve('/me/work-records'), label: 'Work records' }
	];
</script>

<AreaNav label="Account" {links} />

{@render children()}
