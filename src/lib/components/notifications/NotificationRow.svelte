<script lang="ts">
	/**
	 * One notification row for `/me/notifications`.
	 *
	 * An unread notification can be marked read here. The write goes to the API
	 * and reports through a toast; `refreshAll` reloads the list from the server.
	 */

	import { refreshAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { apiSend } from '#lib/api/browser.ts';
	import { showError, showSuccess } from '#lib/toast.ts';
	import { formatTimestamp } from '#lib/format.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import type { Notification } from '#lib/api/types.ts';

	let { notification }: { notification: Notification } = $props();

	let isMarking = $state(false);

	const jobHref = $derived(
		notification.jobId ? resolve(`jobs/${encodeURIComponent(notification.jobId)}`) : null
	);

	async function markRead() {
		isMarking = true;

		const result = await apiSend(`/api/v1/me/notifications/${notification.id}/read`, 'POST');

		isMarking = false;

		if (!result.ok) {
			showError(result.message);
			return;
		}

		showSuccess('Notification marked read.');
		await refreshAll();
	}
</script>

<article class="grid gap-3 py-5 sm:grid-cols-[auto_1fr_auto] sm:items-start">
	<span
		class="mt-2 size-2 rounded-full {notification.read ? 'bg-rule' : 'bg-chalk'}"
		aria-hidden="true"
	></span>

	<div>
		<div class="flex flex-wrap items-center gap-2">
			<h2 class="font-semibold">{notification.title}</h2>
			{#if !notification.read}
				<Badge class="bg-highlight/20 text-ink" variant="ghost">Unread</Badge>
			{/if}
		</div>

		{#if notification.body}
			<p class="mt-1 text-sm text-ink/70">{notification.body}</p>
		{/if}

		<p class="mt-1 text-sm text-ink/60">
			<time datetime={notification.createdAt}>{formatTimestamp(notification.createdAt)}</time>
		</p>
	</div>

	<div class="flex flex-wrap gap-2 sm:justify-end">
		{#if jobHref}
			<Button href={jobHref} size="sm" variant="ghost">View job</Button>
		{/if}

		{#if !notification.read}
			<Button disabled={isMarking} onclick={markRead} size="sm" type="button" variant="outline">
				{isMarking ? 'Marking…' : 'Mark read'}
			</Button>
		{/if}
	</div>
</article>
