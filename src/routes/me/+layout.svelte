<script lang="ts">
	/**
	 * Account area layout (`/me/*`).
	 *
	 * Adds the section tabs shared by the account pages, choosing the tabs that fit
	 * the role. The session guard lives in `+layout.server.ts`; the root layout has
	 * already loaded the user.
	 */

	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import AreaNav from '#lib/components/AreaNav.svelte';
	import type { UserRole } from '#lib/api/types.ts';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	const linksByRole: Record<UserRole, { href: ResolvedPathname; label: string }[]> = {
		STUDENT: [
			{ href: resolve('/me'), label: 'Overview' },
			{ href: resolve('/me/profile'), label: 'Student profile' },
			{ href: resolve('/me/applications'), label: 'Applications' },
			{ href: resolve('/me/saved-jobs'), label: 'Saved jobs' },
			{ href: resolve('/me/notifications'), label: 'Notifications' },
			{ href: resolve('/me/verification'), label: 'Verification' },
			{ href: resolve('/me/work-records'), label: 'Work records' }
		],
		EMPLOYER: [
			{ href: resolve('/me'), label: 'Overview' },
			{ href: resolve('/employer/profile'), label: 'Company profile' },
			{ href: resolve('/employer/jobs'), label: 'Jobs' },
			{ href: resolve('/me/notifications'), label: 'Notifications' },
			{ href: resolve('/me/verification'), label: 'Verification' }
		],
		ADMIN: [
			{ href: resolve('/me'), label: 'Overview' },
			{ href: resolve('/admin'), label: 'Admin area' }
		]
	};

	const links = $derived(linksByRole[data.user?.role ?? 'STUDENT']);
</script>

<AreaNav label="Account" {links} />

{@render children()}
