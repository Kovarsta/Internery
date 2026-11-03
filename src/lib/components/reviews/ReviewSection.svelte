<script lang="ts">
	/**
	 * Review block for a completed job.
	 *
	 * Shows the form until the viewer has reviewed the other party, then a short
	 * confirmation. The `hasReviewed` flag comes from the page load, so a refresh
	 * after a write changes the block without local guesswork.
	 */

	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.ts';
	import ReviewForm from './ReviewForm.svelte';

	let {
		jobId,
		revieweeId,
		revieweeName,
		hasReviewed,
		issuesWorkRecord = false
	}: {
		jobId: string;
		revieweeId: string;
		revieweeName: string;
		hasReviewed: boolean;
		issuesWorkRecord?: boolean;
	} = $props();
</script>

<section class="mt-6 border border-rule bg-card p-5">
	<h2 class="text-lg font-semibold">Review {revieweeName}</h2>

	<p class="mt-1 text-sm text-ink/70">
		{#if issuesWorkRecord}
			The job is complete. Your rating issues {revieweeName}'s signed work record.
		{:else}
			The job is complete. Your rating and comment appear on {revieweeName}'s profile.
		{/if}
	</p>

	{#if hasReviewed}
		<Alert class="mt-4">
			<AlertTitle>Review saved</AlertTitle>
			<AlertDescription>
				You already reviewed {revieweeName} for this job.
			</AlertDescription>
		</Alert>
	{:else}
		<ReviewForm {jobId} {revieweeId} {issuesWorkRecord} />
	{/if}
</section>
