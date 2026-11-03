<script lang="ts">
	/**
	 * Root layout.
	 *
	 * Loads the global stylesheet, renders the navigation and wraps every page in the same
	 * container. The header switches between the guest links and the links for the signed-in
	 * role; `data.user` comes from `+layout.server.ts`.
	 */

	import { resolve } from '$app/paths';
	import './layout.css';
	import { Toaster } from 'svelte-french-toast';
	import { Button } from '#lib/components/ui/button/index.ts';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	const dashboardByRole = {
		STUDENT: '/me/applications',
		EMPLOYER: '/employer/jobs',
		ADMIN: '/admin'
	} as const;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header class="border-b border-rule bg-paper">
	<nav class="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
		<a class="text-lg font-extrabold tracking-tight text-ink" href={resolve('/')}>Internery</a>
		<a class="text-sm text-ink/70 hover:text-ink" href={resolve('/jobs')}>Jobs</a>
		<a class="text-sm text-ink/70 hover:text-ink" href={resolve('/work-records')}> Work records </a>

		<div class="ml-auto flex items-center gap-4">
			{#if data.user}
				<span class="text-sm text-ink/50">
					{data.user.name}
				</span>
				<a
					class="text-sm text-ink/70 hover:text-ink"
					href={resolve(dashboardByRole[data.user.role])}
				>
					Dashboard
				</a>
				<a class="text-sm text-ink/70 hover:text-ink" href={resolve('/me')}>My account</a>
			{:else}
				<a class="text-sm text-ink/70 hover:text-ink" href={resolve('/login')}>Sign in</a>
				<Button href={resolve('/register')} size="sm">Create account</Button>
			{/if}
		</div>
	</nav>
</header>

<main class="mx-auto max-w-5xl px-4 py-8">
	{@render children()}
</main>

<Toaster gutter={12} position="bottom-right" />
