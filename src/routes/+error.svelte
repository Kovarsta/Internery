<script lang="ts">
	/**
	 * Error page for any route.
	 *
	 * Shows the status and message from the nearest `error()` call or load failure, with a way
	 * back to the home page. The root layout still renders the header around it.
	 */

	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import PageHeader from '#lib/components/PageHeader.svelte';

	const isMissing = $derived(page.status === 404);
</script>

<PageHeader
	title={isMissing ? 'Page not found' : 'Something went wrong'}
	description={page.error?.message ?? 'The page could not be loaded.'}
/>

<a class="text-sm text-slate-600 underline hover:text-slate-900" href={resolve('/')}>
	Back to home
</a>
