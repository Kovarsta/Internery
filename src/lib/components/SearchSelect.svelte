<script lang="ts">
	/**
	 * Searchable single-select combobox.
	 *
	 * Used for category and location pickers. The list filters with Fuse.js, so a
	 * typo still finds the option, while the submitted value is always the exact
	 * option value. The caller decides whether an empty option is allowed.
	 */

	import { Combobox } from 'bits-ui';
	import Fuse from 'fuse.js';
	import { cn } from '#lib/utils.js';

	type SearchOption = {
		value: string;
		label: string;
		/** Extra text included in the search, for example aliases. */
		keywords?: string;
	};

	type Props = {
		items: SearchOption[];
		name: string;
		value?: string;
		placeholder?: string;
		allowEmpty?: boolean;
		emptyLabel?: string;
		required?: boolean;
		id?: string;
		class?: string;
	};

	let {
		items,
		name,
		value = '',
		placeholder = 'Search…',
		allowEmpty = false,
		emptyLabel = 'Any',
		required = false,
		id,
		class: className
	}: Props = $props();

	const options = $derived<SearchOption[]>(
		allowEmpty ? [{ value: '', label: emptyLabel }, ...items] : items
	);

	const fuse = $derived(
		new Fuse(options, {
			keys: ['label', 'keywords'],
			threshold: 0.35,
			ignoreLocation: true,
			minMatchCharLength: 1
		})
	);

	// The effect below re-syncs when the parent reloads or resets the form.
	// svelte-ignore state_referenced_locally
	let selected = $state(value);
	let query = $state('');
	let open = $state(false);

	const selectedLabel = $derived(options.find((option) => option.value === selected)?.label ?? '');

	const matches = $derived.by(() => {
		const text = query.trim();

		return text === '' ? options : fuse.search(text).map((result) => result.item);
	});

	// Re-sync when the parent reloads or resets the form.
	$effect(() => {
		selected = value;
		query = options.find((option) => option.value === value)?.label ?? '';
	});

	function handleOpenChange(nextOpen: boolean) {
		open = nextOpen;
		// Opening starts with an empty query so the whole list is visible.
		// Closing restores the selected label instead of leaving a half-typed query.
		query = nextOpen ? '' : selectedLabel;
	}
</script>

<Combobox.Root
	type="single"
	items={matches}
	{name}
	inputValue={query}
	bind:value={selected}
	bind:open
	onOpenChange={handleOpenChange}
>
	<Combobox.Input
		{id}
		class={cn(
			'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
			className
		)}
		{placeholder}
		{required}
		onclick={() => handleOpenChange(true)}
		oninput={(event) => (query = event.currentTarget.value)}
	/>

	<Combobox.Portal>
		<Combobox.Content
			class="z-50 max-h-64 w-[var(--bits-floating-anchor-width,16rem)] overflow-y-auto rounded-md border border-rule bg-paper p-1 shadow-lg"
		>
			{#each matches as option (option.value)}
				<Combobox.Item
					value={option.value}
					label={option.label}
					class="cursor-pointer rounded px-2.5 py-2 text-sm data-[highlighted]:bg-black/5"
				>
					{option.label}
				</Combobox.Item>
			{:else}
				<p class="px-2.5 py-2 text-sm text-ink/60">No matches</p>
			{/each}
		</Combobox.Content>
	</Combobox.Portal>
</Combobox.Root>
