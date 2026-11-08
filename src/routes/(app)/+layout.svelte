<script lang="ts">
	/**
	 * Root layout.
	 *
	 * Loads the global stylesheet, renders the navigation, page content and footer, and wraps every
	 * page in the same column. The header switches between the guest links and the links for the
	 * signed-in role; `data.user` comes from `+layout.server.ts`.
	 */

	import { resolve } from '$app/paths';
	import './layout.css';
	import { Toaster } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.ts';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	const dashboardByRole = {
		STUDENT: 'me/applications',
		EMPLOYER: 'employer/jobs',
		ADMIN: 'admin'
	} as const;

	const year = new Date().getFullYear();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex min-h-screen flex-col">
	<header class="sticky top-0 z-40 border-b border-rule bg-paper">
		<nav class="mx-auto flex min-h-14 max-w-5xl flex-wrap items-center gap-4 px-4">
			<a class="text-lg font-extrabold tracking-tight text-ink" href={resolve('')}>Internery</a>
			<a class="text-sm text-ink/70 hover:text-ink" href={resolve('jobs')}>Jobs</a>
			<a class="hidden text-sm text-ink/70 hover:text-ink sm:inline" href={resolve('work-records')}>
				Work records
			</a>

			<div class="ml-auto flex items-center gap-4">
				{#if data.user}
					<a
						class="max-w-28 truncate text-sm text-ink/60 hover:text-ink sm:max-w-40"
						href={resolve('me')}
						title="My account"
					>
						{data.user.name}
					</a>
					<a
						class="hidden text-sm text-ink/70 hover:text-ink sm:inline"
						href={resolve(dashboardByRole[data.user.role])}
					>
						Dashboard
					</a>
					<form method="POST" action={resolve('logout')}>
						<button class="text-sm text-ink/70 hover:text-ink" type="submit">Sign out</button>
					</form>
				{:else}
					<a class="text-sm text-ink/70 hover:text-ink" href={resolve('login')}>Sign in</a>
					<Button href={resolve('register')} size="sm">Create account</Button>
				{/if}
			</div>
		</nav>
	</header>

	<main class="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
		{@render children()}
	</main>

	<footer class="mt-16 border-t border-rule bg-paper">
		<div class="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-[1.5fr_1fr_1fr]">
			<div>
				<a class="text-lg font-extrabold tracking-tight text-ink" href={resolve('')}>Internery</a>
				<p class="mt-2 max-w-sm text-sm text-ink/60">
					Part-time work for students in Vietnam. Find a shift, apply with your profile, and build a
					signed work record.
				</p>
			</div>

			<div>
				<h2 class="text-sm font-semibold">Explore</h2>
				<ul class="mt-3 space-y-2 text-sm text-ink/70">
					<li><a class="hover:text-ink" href={resolve('jobs')}>Open shifts</a></li>
					<li>
						<a class="hover:text-ink" href={resolve('work-records')}>Work records</a>
					</li>
				</ul>
			</div>

			<div>
				<h2 class="text-sm font-semibold">Account</h2>
				<ul class="mt-3 space-y-2 text-sm text-ink/70">
					{#if data.user}
						<li><a class="hover:text-ink" href={resolve('me')}>My account</a></li>
						<li>
							<a class="hover:text-ink" href={resolve(dashboardByRole[data.user.role])}>
								Dashboard
							</a>
						</li>
						<li>
							<form method="POST" action={resolve('logout')}>
								<button class="hover:text-ink" type="submit">Sign out</button>
							</form>
						</li>
					{:else}
						<li><a class="hover:text-ink" href={resolve('login')}>Sign in</a></li>
						<li><a class="hover:text-ink" href={resolve('register')}>Create account</a></li>
					{/if}
				</ul>
			</div>
		</div>

		<div class="border-t border-rule">
			<p class="mx-auto max-w-5xl px-4 py-4 text-xs text-ink/50">
				© {year} Internery. Built for students in Vietnam. By students, for students.
			</p>
		</div>
	</footer>
</div>

<Toaster position="bottom-right" />
