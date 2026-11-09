<script lang="ts">
	/**
	 * CV control for `/me/profile`.
	 *
	 * Replaces the CV through `PUT /me/cv` and removes it through `DELETE /me/cv`.
	 * Applications keep the CV snapshot they were sent with, so a replacement only
	 * affects future applications.
	 */

	import { refreshAll } from '$app/navigation';
	import { apiSend, apiUpload } from '#lib/api/browser.ts';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { formatFileSize } from '#lib/format.ts';
	import { showError, showSuccess } from '#lib/toast.ts';
	import type { CvInfo } from '#lib/api/types.ts';

	const MAX_CV_BYTES = 5 * 1024 * 1024;
	const ACCEPTED_EXTENSIONS = ['pdf', 'docx'];

	let { cv }: { cv: CvInfo | null } = $props();

	let files = $state<FileList>();
	let fileInput = $state<HTMLInputElement | null>(null);
	let isSaving = $state(false);
	let isConfirmingRemove = $state(false);

	const selectedFile = $derived(files?.[0] ?? null);
	const isPdf = $derived(cv?.mimeType === 'application/pdf');

	async function upload() {
		if (!selectedFile) {
			return;
		}

		const problem = findProblem(selectedFile);

		if (problem) {
			showError(problem);
			return;
		}

		const body = new FormData();
		body.append('file', selectedFile);

		isSaving = true;

		const result = await apiUpload('/api/v1/me/cv', 'PUT', body);

		isSaving = false;

		if (!result.ok) {
			showError(result.message);
			return;
		}

		if (fileInput) {
			fileInput.value = '';
		}

		showSuccess(cv ? 'CV replaced.' : 'CV uploaded.');
		await refreshAll();
	}

	async function remove() {
		isSaving = true;

		const result = await apiSend('/api/v1/me/cv', 'DELETE');

		isSaving = false;

		if (!result.ok) {
			showError(result.message);
			return;
		}

		showSuccess('CV removed.');
		await refreshAll();
	}

	/** Returns the first problem with the chosen file, or null when it can be sent. */
	function findProblem(file: File): string | null {
		const extension = file.name.toLowerCase().split('.').pop() ?? '';

		if (!ACCEPTED_EXTENSIONS.includes(extension)) {
			return 'Choose a PDF or DOCX file.';
		}

		if (file.size > MAX_CV_BYTES) {
			return 'The CV must be 5 MB or smaller.';
		}

		return null;
	}
</script>

<section class="mt-6 border border-rule bg-card p-6">
	<h2 class="text-lg font-semibold">CV</h2>
	<p class="mt-1 max-w-xl text-sm text-ink/70">
		Your current CV is attached to every new application. Applications you already sent keep the CV
		they were sent with.
	</p>

	{#if cv}
		<div class="mt-4 flex flex-wrap items-center gap-3">
			<div>
				<p class="font-medium">{cv.fileName}</p>
				<p class="text-sm text-ink/60">
					{isPdf ? 'PDF' : 'DOCX'} · {formatFileSize(cv.sizeBytes)}
				</p>
			</div>

			<Button href="/api/v1/me/cv" size="sm" variant="outline">Download</Button>
			<Button
				disabled={isSaving}
				onclick={() => (isConfirmingRemove = true)}
				size="sm"
				type="button"
				variant="ghost"
			>
				Remove
			</Button>
		</div>
	{:else}
		<p class="mt-4 text-sm text-ink/60">No CV yet. Applications are sent without one.</p>
	{/if}

	<div class="mt-5 max-w-md">
		<Label class="mb-1" for="cv-file">{cv ? 'Replace the CV' : 'Upload a CV'}</Label>
		<Input accept=".pdf,.docx" bind:files bind:ref={fileInput} id="cv-file" type="file" />
		<p class="mt-1 text-xs text-ink/60">PDF or DOCX, up to 5 MB.</p>

		<Button
			class="mt-2"
			disabled={!selectedFile || isSaving}
			onclick={upload}
			size="sm"
			type="button"
		>
			{isSaving ? 'Uploading…' : cv ? 'Replace CV' : 'Upload CV'}
		</Button>
	</div>

	<ConfirmDialog
		bind:open={isConfirmingRemove}
		confirmLabel="Remove CV"
		description="The file is deleted from your profile. Applications you already sent keep their CV snapshot. This cannot be undone."
		destructive
		onconfirm={remove}
		title="Remove your CV?"
	/>
</section>
