<script lang="ts">
	/**
	 * Employer verification (`/me/verification`).
	 *
	 * Reads the latest request with `GET /me/verification-request`; submitting one arrives with
	 * the trust phase (`POST /me/verification-request`). Skeleton only.
	 */

	import PageHeader from '#lib/components/PageHeader.svelte';
	import SkeletonNotice from '#lib/components/SkeletonNotice.svelte';
</script>

<PageHeader
	title="Employer verification"
	description="Submit a business licence to request the Verified badge on your jobs."
/>

<div class="rounded-xl border border-slate-200 bg-white p-6">
	<p class="text-sm text-slate-600">
		<span class="font-medium text-slate-900">Current status:</span>
		not loaded yet
	</p>

	<button
		class="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
		disabled
		type="button"
	>
		Request verification
	</button>
</div>

<div class="mt-4">
	<SkeletonNotice>
		Verification skeleton. The latest request is readable; submitting one arrives with the trust
		phase.
	</SkeletonNotice>
</div>
