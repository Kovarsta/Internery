<script lang="ts">
	/**
	 * Apply and save controls for `/jobs/[jobId]`.
	 *
	 * Writes go to the API from the browser so the result can be a toast without a
	 * navigation. `refreshAll` then reloads the page data, so the applied and
	 * saved states come from the API rather than local guesswork.
	 */

	import { refreshAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { showError, showSuccess } from '#lib/toast.ts';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { Textarea } from '#lib/components/ui/textarea/index.ts';
	import { apiSend } from '#lib/api/browser.ts';
	import { applicationStatusLabel } from '#lib/labels.ts';
	import type { JobDetail } from '#lib/api/types.ts';

	type ViewerRole = 'STUDENT' | 'EMPLOYER' | 'ADMIN';

	let { job, role }: { job: JobDetail; role?: ViewerRole } = $props();

	let message = $state('');
	let isSubmitting = $state(false);
	let isSaving = $state(false);

	async function submitApplication(event: SubmitEvent) {
		event.preventDefault();

		isSubmitting = true;

		const result = await apiSend(`/api/v1/jobs/${job.id}/applications`, 'POST', {
			message: message.trim() ? message.trim() : null,
			attachCv: true
		});

		isSubmitting = false;

		if (!result.ok) {
			showError(result.message);
			return;
		}

		message = '';
		showSuccess('Application sent.');
		await refreshAll();
	}

	async function toggleSaved() {
		isSaving = true;

		const method = job.saved ? 'DELETE' : 'PUT';
		const result = await apiSend(`/api/v1/me/saved-jobs/${job.id}`, method);

		isSaving = false;

		if (!result.ok) {
			showError(result.message);
			return;
		}

		showSuccess(job.saved ? 'Removed from saved jobs.' : 'Saved for later.');
		await refreshAll();
	}
</script>

{#if role === 'STUDENT'}
	<Button class="w-full" disabled={isSaving} onclick={toggleSaved} type="button" variant="outline">
		{job.saved ? 'Remove from saved' : 'Save for later'}
	</Button>
{/if}

{#if job.myApplication}
	<Alert class="mt-4">
		<AlertTitle>Application sent</AlertTitle>
		<AlertDescription>
			Status: {applicationStatusLabel[job.myApplication.status].toLowerCase()}.
		</AlertDescription>
	</Alert>
{:else if !job.acceptingApplications}
	<p class="mt-4 text-sm text-ink/60">This job is not accepting applications.</p>
{:else if !role}
	<Button class="mt-4 w-full" href={resolve('login')}>Sign in to apply</Button>
{:else if role === 'STUDENT'}
	<form class="mt-4 space-y-3" onsubmit={submitApplication}>
		<div>
			<Label class="mb-1" for="apply-message">Message to the employer</Label>
			<Textarea
				bind:value={message}
				id="apply-message"
				maxlength={1000}
				placeholder="Optional: say when you can start."
				rows={3}
			/>
		</div>

		<Button class="w-full" disabled={isSubmitting} type="submit">
			{isSubmitting ? 'Sending…' : 'Apply to this job'}
		</Button>

		<p class="text-xs text-ink/60">Your profile CV is attached when you have uploaded one.</p>
	</form>
{:else}
	<p class="mt-4 text-sm text-ink/60">Only student accounts can apply to jobs.</p>
{/if}
