<script lang="ts">
	/**
	 * One account row on `/admin/users`.
	 *
	 * Locking asks for a reason first, because the reason is stored on the
	 * account and shown to the next admin, then confirms because it blocks
	 * sign-in. Unlocking is reversible and runs directly. Both writes tell the
	 * row's outcome through a toast and reload the list, so the status always
	 * comes from the server.
	 */

	import { refreshAll } from '$app/navigation';
	import { apiSend } from '#lib/api/browser.ts';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { formatTimestamp } from '#lib/format.ts';
	import { accountStatusClass, accountStatusLabel, userRoleLabel } from '#lib/labels.ts';
	import { showError, showSuccess } from '#lib/toast.ts';
	import type { AdminUser } from '#lib/api/types.ts';

	let { user }: { user: AdminUser } = $props();

	let isLockFormOpen = $state(false);
	let isConfirmingLock = $state(false);
	let isSaving = $state(false);
	let reason = $state('');

	const isLocked = $derived(user.status === 'LOCKED');

	async function lock() {
		isSaving = true;

		const trimmedReason = reason.trim();
		const result = await apiSend<AdminUser>(`/api/v1/admin/users/${user.id}/lock`, 'POST', {
			reason: trimmedReason === '' ? null : trimmedReason
		});

		isSaving = false;

		if (!result.ok) {
			showError(result.message);
			return;
		}

		isLockFormOpen = false;
		reason = '';
		showSuccess(`${user.fullName} can no longer sign in.`);
		await refreshAll();
	}

	async function unlock() {
		isSaving = true;

		const result = await apiSend<AdminUser>(`/api/v1/admin/users/${user.id}/unlock`, 'POST');

		isSaving = false;

		if (!result.ok) {
			showError(result.message);
			return;
		}

		showSuccess(`${user.fullName} can sign in again.`);
		await refreshAll();
	}
</script>

<article class="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-start">
	<div>
		<div class="flex flex-wrap items-center gap-2">
			<h2 class="text-lg leading-snug font-semibold">{user.fullName}</h2>
			<Badge class={accountStatusClass[user.status]} variant="ghost">
				{accountStatusLabel[user.status]}
			</Badge>
			<Badge class="bg-muted text-muted-foreground" variant="ghost">
				{userRoleLabel[user.role]}
			</Badge>
		</div>

		<p class="mt-1 text-sm text-ink/70">{user.email}</p>
		<p class="text-sm text-ink/60">Joined {formatTimestamp(user.createdAt)}</p>

		{#if user.lockedAt && user.lockReason}
			<p class="mt-2 border-l-2 border-warning/40 pl-3 text-sm text-ink/80">
				Locked {formatTimestamp(user.lockedAt)}: {user.lockReason}
			</p>
		{:else if user.lockedAt}
			<p class="mt-2 border-l-2 border-warning/40 pl-3 text-sm text-ink/80">
				Locked {formatTimestamp(user.lockedAt)} without a reason.
			</p>
		{/if}
	</div>

	<div class="flex flex-wrap gap-2 sm:justify-end">
		{#if isLocked}
			<Button disabled={isSaving} onclick={unlock} size="sm" type="button" variant="outline">
				{isSaving ? 'Unlocking…' : 'Unlock'}
			</Button>
		{:else}
			<Button
				disabled={isSaving}
				onclick={() => (isLockFormOpen = !isLockFormOpen)}
				size="sm"
				type="button"
				variant="outline"
			>
				{isLockFormOpen ? 'Cancel' : 'Lock'}
			</Button>
		{/if}
	</div>
</article>

{#if isLockFormOpen && !isLocked}
	<div class="mb-5 border border-rule bg-card p-4">
		<Label class="mb-1" for="lock-reason-{user.id}">Reason (optional)</Label>
		<Input
			bind:value={reason}
			id="lock-reason-{user.id}"
			maxlength={500}
			placeholder="Why this account is being locked"
		/>
		<p class="mt-1 text-xs text-ink/60">The reason is stored on the account and shown to admins.</p>

		<div class="mt-3 flex gap-2">
			<Button
				disabled={isSaving}
				onclick={() => (isConfirmingLock = true)}
				size="sm"
				type="button"
				variant="destructive"
			>
				{isSaving ? 'Locking…' : 'Lock account'}
			</Button>
			<Button
				disabled={isSaving}
				onclick={() => (isLockFormOpen = false)}
				size="sm"
				type="button"
				variant="ghost"
			>
				Cancel
			</Button>
		</div>
	</div>
{/if}

<ConfirmDialog
	bind:open={isConfirmingLock}
	confirmLabel="Lock account"
	description={`This stops ${user.fullName} from signing in until an admin unlocks the account. The reason is stored and shown to admins.`}
	destructive
	onconfirm={lock}
	title={`Lock ${user.fullName}'s account?`}
/>
