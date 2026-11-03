<script lang="ts">
	/**
	 * Rating and comment form for `POST /jobs/{jobId}/reviews`.
	 *
	 * The write goes to the API from the browser so it can report through a toast.
	 * `refreshAll` then reloads the page data, which switches the surrounding
	 * section to its reviewed state.
	 */

	import { refreshAll } from '$app/navigation';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { Textarea } from '#lib/components/ui/textarea/index.ts';
	import { apiSend } from '#lib/api/browser.ts';
	import { showError, showSuccess } from '#lib/toast.ts';

	let {
		jobId,
		revieweeId,
		issuesWorkRecord = false
	}: {
		jobId: string;
		revieweeId: string;
		issuesWorkRecord?: boolean;
	} = $props();

	const starValues = [1, 2, 3, 4, 5] as const;

	let rating = $state(0);
	let comment = $state('');
	let isSubmitting = $state(false);

	async function submitReview(event: SubmitEvent) {
		event.preventDefault();

		isSubmitting = true;

		const result = await apiSend<{ workRecordId: string | null }>(
			`/api/v1/jobs/${jobId}/reviews`,
			'POST',
			{
				revieweeId,
				rating,
				comment: comment.trim() ? comment.trim() : null
			}
		);

		isSubmitting = false;

		if (!result.ok) {
			showError(result.message);
			return;
		}

		showSuccess(issuesWorkRecord ? 'Review saved and the work record is ready.' : 'Review saved.');
		await refreshAll();
	}
</script>

<form class="mt-4 space-y-4" onsubmit={submitReview}>
	<fieldset>
		<legend class="text-sm font-medium">Rating</legend>

		<div class="mt-2 flex items-center gap-1">
			{#each starValues as value (value)}
				<button
					aria-label="{value} out of 5"
					aria-pressed={rating === value}
					class="rounded px-0.5 text-2xl leading-none {value <= rating
						? 'text-highlight'
						: 'text-rule'} hover:text-highlight focus-visible:ring-2 focus-visible:ring-chalk focus-visible:outline-none"
					onclick={() => (rating = value)}
					type="button"
				>
					<span aria-hidden="true">★</span>
				</button>
			{/each}

			<span class="ml-2 text-sm text-ink/60">
				{rating === 0 ? 'Pick a rating' : `${rating} out of 5`}
			</span>
		</div>
	</fieldset>

	<div>
		<Label class="mb-1" for="review-comment">Comment</Label>
		<Textarea
			bind:value={comment}
			id="review-comment"
			maxlength={500}
			placeholder="What was it like working with them?"
			rows={4}
		/>
		<p class="mt-1 text-xs text-ink/60">{comment.length}/500</p>
	</div>

	<Button disabled={rating === 0 || isSubmitting} type="submit">
		{isSubmitting ? 'Saving…' : 'Save review'}
	</Button>
</form>
