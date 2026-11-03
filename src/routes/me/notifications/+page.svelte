<script lang="ts">
	/**
	 * Notifications (`/me/notifications`).
	 *
	 * Lists `GET /me/notifications` with an unread filter kept in the URL. Marking
	 * all read belongs to the page; each row owns marking one read.
	 */

	import { refreshAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import NotificationRow from '#lib/components/notifications/NotificationRow.svelte';
	import EmptyState from '#lib/components/jobs/EmptyState.svelte';
	import { showError, showSuccess } from '#lib/toast.ts';
	import { apiSend } from '#lib/api/browser.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let isMarkingAll = $state(false);

	const filters: { label: string; unreadOnly: boolean }[] = [
		{ label: 'All', unreadOnly: false },
		{ label: 'Unread', unreadOnly: true }
	];

	async function markAllRead() {
		isMarkingAll = true;

		const result = await apiSend('/api/v1/me/notifications/read-all', 'POST');

		isMarkingAll = false;

		if (!result.ok) {
			showError(result.message);
			return;
		}

		showSuccess('All notifications marked read.');
		await refreshAll();
	}
</script>

<div class="flex flex-wrap items-start justify-between gap-3">
	<div>
		<h1 class="text-3xl font-extrabold tracking-tight">Notifications</h1>
		<p class="mt-2 text-ink/70">
			{data.unreadCount}
			unread
			{#if !data.unreadOnly}
				· {data.notifications.total} in total
			{/if}
		</p>
	</div>

	<Button
		disabled={isMarkingAll || data.unreadCount === 0}
		onclick={markAllRead}
		size="sm"
		type="button"
		variant="outline"
	>
		{isMarkingAll ? 'Marking…' : 'Mark all read'}
	</Button>
</div>

<nav class="mt-6 flex flex-wrap gap-2" aria-label="Filter by read state">
	{#each filters as filter (filter.label)}
		<Button
			href={filter.unreadOnly
				? resolve('/me/notifications?unread=true')
				: resolve('/me/notifications')}
			size="sm"
			variant={data.unreadOnly === filter.unreadOnly ? 'default' : 'outline'}
		>
			{filter.label}
		</Button>
	{/each}
</nav>

{#if data.notifications.items.length > 0}
	<div class="mt-6 divide-y divide-rule border-t border-rule">
		{#each data.notifications.items as notification (notification.id)}
			<NotificationRow {notification} />
		{/each}
	</div>
{:else}
	<EmptyState
		title="No notifications here"
		description="Application decisions, job changes and reminders appear here."
	/>
{/if}
