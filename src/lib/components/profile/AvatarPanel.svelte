<script lang="ts">
	/**
	 * Profile picture control for `/me`.
	 *
	 * Choosing a file opens a square cropper, and the cropped 512 × 512 JPEG is
	 * uploaded through `PUT /me/avatar`. Resetting goes through
	 * `DELETE /me/avatar`. The server still detects the format and re-encodes the
	 * image; the checks here only give a faster message.
	 */

	import { refreshAll } from '$app/navigation';
	import { apiSend, apiUpload } from '#lib/api/browser.ts';
	import AvatarCropper from '#lib/components/profile/AvatarCropper.svelte';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { showError, showSuccess } from '#lib/toast.ts';
	import type { UserMe } from '#lib/api/types.ts';

	// The cropper outputs a small square, so the original may be a normal phone
	// photo. This cap only keeps the browser from decoding something enormous.
	const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
	const ACCEPTED_TYPES = ['image/png', 'image/jpeg'];

	type Props = {
		user: UserMe;
	};

	let { user }: Props = $props();

	let fileInput = $state<HTMLInputElement | null>(null);
	let previewUrl = $state<string | null>(null);
	let isSaving = $state(false);
	let isConfirmingReset = $state(false);

	// Two letters for the placeholder circle: the first letter of the last two
	// words of the name, for example "Nguyen Van An" -> "VA".
	const initials = $derived(
		user.fullName
			.split(' ')
			.filter((part) => part !== '')
			.slice(-2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('')
	);

	// `previewUrl` is a `blob:` URL made by `URL.createObjectURL(file)` in
	// `handleFileSelection`. The browser keeps the whole selected file in memory
	// for as long as that URL exists. The cropped JPEG that gets uploaded is a
	// separate canvas blob, so releasing this preview never touches the request.
	//
	// This effect is the cleanup hook: it subscribes to `previewUrl`, and Svelte
	// calls the returned function just before the effect runs again and once
	// when the component is removed. It does not render or fetch anything.
	$effect(() => {
		// Keep a copy of the value for this run. The cleanup must revoke the URL
		// this run created; reading `previewUrl` inside the cleanup would see the
		// newer value, which the cropper may already be showing.
		const url = previewUrl;

		return () => {
			// Runs when the preview changes (cancelled, uploaded, or replaced)
			// and on unmount. The cropper has already switched to the new URL or
			// been removed by then, so the old one is safe to release.
			if (url !== null) {
				URL.revokeObjectURL(url);
			}
		};
	});

	/** Checks the picked file and shows the cropper for it. */
	function handleFileSelection(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];

		// Clear the input first: browsers only fire `change` when the value
		// changes, so without this picking the same file again would do nothing.
		clearInput();

		if (!file) {
			return;
		}

		const problem = findProblem(file);

		if (problem) {
			showError(problem);
			return;
		}

		previewUrl = URL.createObjectURL(file);
	}

	/** Uploads the square JPEG the cropper produced. */
	async function uploadCroppedPicture(file: File) {
		const body = new FormData();
		body.append('file', file);

		isSaving = true;

		const result = await apiUpload<UserMe>('/api/v1/me/avatar', 'PUT', body);

		isSaving = false;

		if (!result.ok) {
			showError(result.message);
			return;
		}

		// Closing the cropper also revokes the preview URL through the effect.
		previewUrl = null;
		showSuccess('Profile picture updated.');
		await refreshAll();
	}

	async function reset() {
		isSaving = true;

		const result = await apiSend('/api/v1/me/avatar', 'DELETE');

		isSaving = false;

		if (!result.ok) {
			showError(result.message);
			return;
		}

		showSuccess('Profile picture removed.');
		await refreshAll();
	}

	function cancelCrop() {
		previewUrl = null;
	}

	/** Empties the file input so choosing the same file again still fires. */
	function clearInput() {
		if (fileInput) {
			fileInput.value = '';
		}
	}

	/** Returns the first problem with the chosen file, or null when it can be cropped. */
	function findProblem(file: File): string | null {
		if (!ACCEPTED_TYPES.includes(file.type)) {
			return 'Choose a PNG or JPEG image.';
		}

		if (file.size > MAX_SOURCE_BYTES) {
			return 'The image must be 10 MB or smaller.';
		}

		return null;
	}
</script>

{#if previewUrl}
	<AvatarCropper
		imageUrl={previewUrl}
		{isSaving}
		oncancel={cancelCrop}
		onconfirm={uploadCroppedPicture}
	/>
{:else}
	<section class="flex flex-wrap items-center gap-5">
		{#if user.avatarUrl}
			<img
				alt=""
				class="size-20 rounded-full border border-rule object-cover"
				src={user.avatarUrl}
			/>
		{:else}
			<span
				class="flex size-20 items-center justify-center rounded-full bg-muted text-xl font-semibold text-muted-foreground"
			>
				{initials}
			</span>
		{/if}

		<div class="min-w-56 flex-1">
			<Label class="mb-1" for="avatar-file">Profile picture</Label>
			<Input
				accept="image/png,image/jpeg"
				bind:ref={fileInput}
				id="avatar-file"
				onchange={handleFileSelection}
				type="file"
			/>
			<p class="mt-1 text-xs text-ink/60">
				PNG or JPEG, up to 10 MB. You can crop and zoom before saving.
			</p>

			{#if user.avatarUrl}
				<Button
					class="mt-2"
					disabled={isSaving}
					onclick={() => (isConfirmingReset = true)}
					size="sm"
					type="button"
					variant="ghost"
				>
					Remove picture
				</Button>
			{/if}
		</div>
	</section>
{/if}

<ConfirmDialog
	bind:open={isConfirmingReset}
	confirmLabel="Remove picture"
	description="This removes the current profile picture. You can upload a new one later, but the current image cannot be recovered."
	destructive
	onconfirm={reset}
	title="Remove your profile picture?"
/>
