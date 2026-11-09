<script lang="ts">
	/**
	 * Confirmation dialog for destructive or irreversible actions.
	 *
	 * Native `<dialog>`: focus trapping, Escape and the backdrop come from the browser. The caller
	 * owns the action; the dialog closes after it resolves and reports failure through the caller's
	 * toast.
	 */

	import { Button } from '#lib/components/ui/button/index.ts';

	type Props = {
		open?: boolean;
		title: string;
		description: string;
		confirmLabel?: string;
		cancelLabel?: string;
		destructive?: boolean;
		onconfirm: () => void | Promise<void>;
	};

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		destructive = false,
		onconfirm
	}: Props = $props();

	let dialog = $state<HTMLDialogElement>();
	let isWorking = $state(false);

	$effect(() => {
		if (!dialog) {
			return;
		}

		if (open && !dialog.open) {
			dialog.showModal();
		}

		if (!open && dialog.open) {
			dialog.close();
		}
	});

	async function confirm() {
		isWorking = true;

		try {
			await onconfirm();
		} finally {
			isWorking = false;
			open = false;
		}
	}
</script>

<dialog
	bind:this={dialog}
	class="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-rule bg-paper p-0 text-ink shadow-xl backdrop:bg-ink/30"
	onclose={() => (open = false)}
>
	<div class="p-5">
		<h2 class="text-lg font-semibold">{title}</h2>
		<p class="mt-2 text-sm leading-relaxed text-ink/70">{description}</p>

		<div class="mt-5 flex justify-end gap-2">
			<Button disabled={isWorking} onclick={() => (open = false)} type="button" variant="ghost">
				{cancelLabel}
			</Button>
			<Button
				disabled={isWorking}
				onclick={confirm}
				type="button"
				variant={destructive ? 'destructive' : 'default'}
			>
				{isWorking ? 'Working.' : confirmLabel}
			</Button>
		</div>
	</div>
</dialog>
