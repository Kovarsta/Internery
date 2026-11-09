<script lang="ts">
	/**
	 * Account area layout (`/me/*`).
	 *
	 * The account tabs cover identity and settings. Student work pages
	 * (`/me/applications`, `/me/saved-jobs`, `/me/work-records`) switch to the dashboard tab set,
	 * so the account and workspace sections stay visually distinct while sharing one URL space.
	 */

	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import { page } from '$app/state';
	import AreaNav from '#lib/components/AreaNav.svelte';
	import type { UserRole } from '#lib/api/types.ts';
	import type { LayoutProps } from './$types';

	type AreaLink = { href: ResolvedPathname; label: string };

	let { children, data }: LayoutProps = $props();

	const accountLinksByRole: Record<UserRole, AreaLink[]> = {
		STUDENT: [
			{ href: resolve('me'), label: 'Overview' },
			{ href: resolve('me/profile'), label: 'Student profile' },
			{ href: resolve('me/notifications'), label: 'Notifications' }
		],
		EMPLOYER: [
			{ href: resolve('me'), label: 'Overview' },
			{ href: resolve('me/company-profile'), label: 'Company profile' },
			{ href: resolve('me/notifications'), label: 'Notifications' },
			{ href: resolve('me/verification'), label: 'Verification' }
		],
		ADMIN: [
			{ href: resolve('me'), label: 'Overview' },
			{ href: resolve('me/admin-profile'), label: 'Personal details' },
			{ href: resolve('me/notifications'), label: 'Notifications' },
			{ href: resolve('admin'), label: 'Admin area' }
		]
	};

	const dashboardLinksByRole: Partial<Record<UserRole, AreaLink[]>> = {
		STUDENT: [
			{ href: resolve('me/applications'), label: 'Applications' },
			{ href: resolve('me/saved-jobs'), label: 'Saved jobs' },
			{ href: resolve('me/work-records'), label: 'Work records' }
		]
	};

	const dashboardRoutes = new Set<string | null>([
		'/(app)/me/applications',
		'/(app)/me/saved-jobs',
		'/(app)/me/work-records'
	]);

	const role = $derived(data.user?.role ?? 'STUDENT');
	const isDashboard = $derived(dashboardRoutes.has(page.route.id));
	const links = $derived(
		isDashboard
			? (dashboardLinksByRole[role] ?? accountLinksByRole[role])
			: accountLinksByRole[role]
	);
</script>

<AreaNav label={isDashboard ? 'Student dashboard' : 'Account'} {links} />

{@render children()}
