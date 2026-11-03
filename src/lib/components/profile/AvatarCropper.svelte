<script lang="ts">
	/**
	 * Square cropper used by the avatar control on `/me`.
	 *
	 * The flow in plain words:
	 * 1. The person drags the picture and uses the zoom slider.
	 * 2. The cropper reports the visible rectangle in image pixels.
	 * 3. "Use this picture" copies that rectangle into a 512 × 512 JPEG.
	 * 4. The parent component uploads the file.
	 */

	import Cropper, { type OnCropCompleteEvent } from 'svelte-easy-crop';
	import { AVATAR_OUTPUT_SIZE, cropImageToSquare, type CropArea } from '#lib/crop-image.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';

	type Props = {
		imageUrl: string;
		isSaving: boolean;
		oncancel: () => void;
		onconfirm: (file: File) => void;
	};

	let { imageUrl, isSaving, oncancel, onconfirm }: Props = $props();

	// The cropper writes to `crop` and `zoom` while the person drags and zooms,
	// so they are two-way bindings even though the template only reads `zoom`.
	let crop = $state({ x: 0, y: 0 });
	let zoom = $state(1);
	let cropArea = $state<CropArea | null>(null);
	let isPreparing = $state(false);
	let errorMessage = $state<string | null>(null);

	const isBusy = $derived(isSaving || isPreparing);

	/** The cropper sends the new rectangle after every drag or zoom change. */
	function rememberCropArea(event: OnCropCompleteEvent) {
		cropArea = event.pixels;
	}

	async function usePicture() {
		if (!cropArea) {
			return;
		}

		isPreparing = true;
		errorMessage = null;

		try {
			const croppedImage = await cropImageToSquare(imageUrl, cropArea, AVATAR_OUTPUT_SIZE);

			// The API accepts PNG and JPEG; JPEG keeps the upload small.
			onconfirm(new File([croppedImage], 'avatar.jpg', { type: 'image/jpeg' }));
		} catch {
			errorMessage = 'The image could not be cropped. Choose another picture.';
		} finally {
			isPreparing = false;
		}
	}
</script>

<div class="max-w-sm">
	<div class="relative h-72 w-full overflow-hidden rounded-lg bg-ink">
		<Cropper
			aspect={1}
			bind:crop
			bind:zoom
			cropShape="round"
			image={imageUrl}
			maxZoom={3}
			minZoom={1}
			oncropcomplete={rememberCropArea}
		/>
	</div>

	<div class="mt-3">
		<Label class="mb-1" for="avatar-zoom">Zoom</Label>
		<input
			aria-label="Zoom"
			bind:value={zoom}
			class="w-full accent-chalk"
			id="avatar-zoom"
			max="3"
			min="1"
			step="0.01"
			type="range"
		/>
	</div>

	{#if errorMessage}
		<p class="mt-2 text-sm text-warning">{errorMessage}</p>
	{/if}

	<div class="mt-3 flex flex-wrap gap-2">
		<Button disabled={!cropArea || isBusy} onclick={usePicture} size="sm" type="button">
			{isBusy ? 'Preparing…' : 'Use this picture'}
		</Button>
		<Button disabled={isBusy} onclick={oncancel} size="sm" type="button" variant="ghost">
			Cancel
		</Button>
	</div>
</div>
