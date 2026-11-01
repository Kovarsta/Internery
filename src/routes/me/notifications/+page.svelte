<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SkeletonNotice from '#lib/components/SkeletonNotice.svelte';
</script>

<PageHeader title="Notifications" description="Application decisions, job changes and reminders." />

<div class="rounded-xl border border-slate-200 bg-white">
	<div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
		<div class="h-3 w-32 rounded bg-slate-200"></div>
		<button
			class="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-600 disabled:cursor-not-allowed"
			disabled
			type="button"
		>
			Mark all read
		</button>
	</div>

	<div class="divide-y divide-slate-100">
		{#each [1, 2, 3] as placeholder (placeholder)}
			<div class="flex gap-3 px-4 py-3">
				<div class="mt-1 size-2 rounded-full bg-slate-300"></div>
				<div class="flex-1">
					<div class="h-3 w-1/3 rounded bg-slate-200"></div>
					<div class="mt-2 h-3 w-2/3 rounded bg-slate-100"></div>
				</div>
			</div>
		{/each}
	</div>
</div>

<div class="mt-4">
	<SkeletonNotice>
		Notifications skeleton. Reads, unread count and mark-as-read are implemented.
	</SkeletonNotice>
</div>
