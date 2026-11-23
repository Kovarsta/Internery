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

	import { onMount } from 'svelte';
	import { reelWords, setupFooterMotion } from '#lib/footer-motion.ts';

	/**
	 * Starts the footer animation once the footer is mounted.
	 *
	 * The animation itself lives in `#lib/footer-motion.ts`; this block only
	 * handles the browser-only setup: reduced motion, the webfont, and cleanup.
	 */
	onMount(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			return;
		}

		const section = footerSection;
		const track = footerTrack;

		if (!section || !track) {
			return;
		}

		let teardown: (() => void) | undefined;
		let isUnmounted = false;

		// SplitText measures characters, so wait for the webfont.
		document.fonts.ready.then(() => {
			if (isUnmounted) {
				return;
			}

			teardown = setupFooterMotion({ section, track });
		});

		return () => {
			isUnmounted = true;
			teardown?.();
		};
	});

	let { children, data }: LayoutProps = $props();

	const dashboardByRole = {
		STUDENT: 'me/applications',
		EMPLOYER: 'employer/jobs',
		ADMIN: 'admin'
	} as const;

	const year = new Date().getFullYear();

	let mobileMenu = $state<HTMLDetailsElement>();
	let footerSection = $state<HTMLElement>();
	let footerTrack = $state<HTMLElement>();

	/** Closes the mobile menu after a link or the sign-out form is used. */
	function closeMobileMenu() {
		if (mobileMenu) {
			mobileMenu.open = false;
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex min-h-screen flex-col">
	<header class="sticky top-0 z-40 border-b border-rule bg-paper">
		<nav class="mx-auto flex min-h-14 max-w-5xl items-center gap-4 px-4">
			<a class="text-lg font-extrabold tracking-tight text-ink" href={resolve('')}>Internery</a>
			<a class="hidden text-sm text-ink/70 hover:text-ink sm:inline" href={resolve('jobs')}>Jobs</a>
			<a class="hidden text-sm text-ink/70 hover:text-ink sm:inline" href={resolve('work-records')}>
				Work records
			</a>

			<div class="ml-auto hidden items-center gap-4 sm:flex">
				{#if data.user}
					<a
						class="max-w-40 truncate text-sm text-ink/60 hover:text-ink"
						href={resolve('me')}
						title="My account"
					>
						{data.user.name}
					</a>
					{#if data.user.role === 'STUDENT'}
						<a class="text-sm text-ink/70 hover:text-ink" href={resolve('recommendations')}>
							Recommendations
						</a>
					{/if}
					<a
						class="text-sm text-ink/70 hover:text-ink"
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

			<details bind:this={mobileMenu} class="relative ml-auto sm:hidden">
				<summary
					class="cursor-pointer list-none rounded-md border border-rule px-3 py-1.5 text-sm font-medium [&::-webkit-details-marker]:hidden"
				>
					Menu
				</summary>

				<div
					class="absolute right-0 z-50 mt-2 w-56 rounded-md border border-rule bg-paper p-2 shadow-lg"
				>
					<div class="flex flex-col">
						<a
							class="rounded px-3 py-2 text-sm hover:bg-black/5"
							href={resolve('jobs')}
							onclick={closeMobileMenu}
						>
							Jobs
						</a>
						<a
							class="rounded px-3 py-2 text-sm hover:bg-black/5"
							href={resolve('work-records')}
							onclick={closeMobileMenu}
						>
							Work records
						</a>

						{#if data.user}
							<div class="my-1 border-t border-rule"></div>
							<a
								class="truncate rounded px-3 py-2 text-sm font-medium hover:bg-black/5"
								href={resolve('me')}
								onclick={closeMobileMenu}
								title="My account"
							>
								{data.user.name}
							</a>
							{#if data.user.role === 'STUDENT'}
								<a
									class="rounded px-3 py-2 text-sm hover:bg-black/5"
									href={resolve('recommendations')}
									onclick={closeMobileMenu}
								>
									Recommendations
								</a>
							{/if}
							<a
								class="rounded px-3 py-2 text-sm hover:bg-black/5"
								href={resolve(dashboardByRole[data.user.role])}
								onclick={closeMobileMenu}
							>
								Dashboard
							</a>
							<form method="POST" action={resolve('logout')} onsubmit={closeMobileMenu}>
								<button
									class="w-full rounded px-3 py-2 text-left text-sm text-ink/70 hover:bg-black/5 hover:text-ink"
									type="submit"
								>
									Sign out
								</button>
							</form>
						{:else}
							<div class="my-1 border-t border-rule"></div>
							<a
								class="rounded px-3 py-2 text-sm hover:bg-black/5"
								href={resolve('login')}
								onclick={closeMobileMenu}
							>
								Sign in
							</a>
							<a
								class="rounded px-3 py-2 text-sm font-medium text-chalk hover:bg-black/5"
								href={resolve('register')}
								onclick={closeMobileMenu}
							>
								Create account
							</a>
						{/if}
					</div>
				</div>
			</details>
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
		<div
			class="overflow-hidden border-t border-rule py-4"
			bind:this={footerSection}
			aria-hidden="true"
		>
			{#snippet reel()}
				<span
					class="footer-reel block h-[1em] shrink-0 overflow-hidden px-[3vw] text-[11vw] leading-none font-extrabold whitespace-nowrap text-ink"
				>
					<span class="footer-reel-track block will-change-transform">
						{#each reelWords as word, index (index)}
							<span
								class="footer-word block h-[1em] text-center"
								class:footer-word--lead={index === 0}
							>
								{word}
							</span>
						{/each}
					</span>
				</span>
			{/snippet}

			<!-- Two identical halves: at -50% the second half sits exactly where the
			     first one started, so the carousel loops without a seam. -->
			<div
				class="footer-track flex w-max flex-nowrap will-change-transform"
				bind:this={footerTrack}
			>
				<div class="flex shrink-0">
					{@render reel()}
					{@render reel()}
				</div>
				<div class="flex shrink-0">
					{@render reel()}
					{@render reel()}
				</div>
			</div>
		</div>
	</footer>
</div>

<Toaster position="bottom-right" />
