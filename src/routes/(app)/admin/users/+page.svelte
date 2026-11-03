<script lang="ts">
	/**
	 * Admin users (`/admin/users`).
	 *
	 * Searches `GET /admin/users` by name or email and filters by role and
	 * status. The filter is a plain GET form, so it works without JavaScript and
	 * the URL keeps the active search.
	 */

	import { resolve } from '$app/paths';
	import AdminUserRow from '#lib/components/admin/AdminUserRow.svelte';
	import EmptyState from '#lib/components/jobs/EmptyState.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Pagination from '#lib/components/jobs/Pagination.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { NativeSelect, NativeSelectOption } from '#lib/components/ui/native-select/index.ts';
	import { userRoleLabel } from '#lib/labels.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const total = $derived(data.users.total);
	const hasFilter = $derived(data.search !== '' || data.role !== '' || data.status !== '');
</script>

<PageHeader title="Users" description="Search accounts, then lock or unlock them with a reason." />

<form class="flex flex-wrap items-end gap-2" method="get">
	<div class="min-w-56 flex-1">
		<Label class="mb-1" for="admin-user-search">Name or email</Label>
		<Input
			id="admin-user-search"
			name="q"
			placeholder="linh@internery.local"
			type="search"
			value={data.search}
		/>
	</div>

	<div>
		<Label class="mb-1" for="admin-user-role">Role</Label>
		<NativeSelect id="admin-user-role" name="role" value={data.role}>
			<NativeSelectOption value="">Any role</NativeSelectOption>
			{#each Object.entries(userRoleLabel) as [value, label] (value)}
				<NativeSelectOption {value}>{label}</NativeSelectOption>
			{/each}
		</NativeSelect>
	</div>

	<div>
		<Label class="mb-1" for="admin-user-status">Status</Label>
		<NativeSelect id="admin-user-status" name="status" value={data.status}>
			<NativeSelectOption value="">Any status</NativeSelectOption>
			<NativeSelectOption value="ACTIVE">Active</NativeSelectOption>
			<NativeSelectOption value="PENDING_VERIFICATION">Unverified</NativeSelectOption>
			<NativeSelectOption value="LOCKED">Locked</NativeSelectOption>
			<NativeSelectOption value="SUSPENDED">Suspended</NativeSelectOption>
			<NativeSelectOption value="DELETED">Deleted</NativeSelectOption>
		</NativeSelect>
	</div>

	<Button size="sm" type="submit">Search</Button>
	{#if hasFilter}
		<Button href={resolve('admin/users')} size="sm" variant="ghost">Clear</Button>
	{/if}
</form>

<p class="mt-4 text-sm text-ink/70">
	{total}
	{total === 1 ? 'account' : 'accounts'}
	{hasFilter ? 'match the filter' : 'in total'}.
</p>

{#if data.users.items.length > 0}
	<div class="mt-2 divide-y divide-rule border-t border-rule">
		{#each data.users.items as user (user.id)}
			<AdminUserRow {user} />
		{/each}
	</div>

	<Pagination
		basePath={resolve('admin/users')}
		page={data.users.page}
		pageSize={data.users.pageSize}
		query={data.filterQuery}
		total={data.users.total}
	/>
{:else}
	<EmptyState
		title="No accounts found"
		description="Try a shorter search, or clear the role and status filters."
		actionLabel="Clear filters"
		actionHref={resolve('admin/users')}
	/>
{/if}
