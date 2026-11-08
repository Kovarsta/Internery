<script lang="ts">
	/**
	 * Searchable single-select combobox.
	 *
	 * Local mode (categories) filters `items` with Fuse.js. Remote mode
	 * (locations) calls `search(query)` and never ships the full list. In both
	 * cases the form receives the exact option value, never the typed text.
	 */

	import { Combobox } from 'bits-ui';
	import Fuse from 'fuse.js';
	import { untrack } from 'svelte';
	import { cn } from '#lib/utils.js';

	type SearchOption = {
		value: string;
		label: string;
		/** Extra text included in the search, for example aliases. */
		keywords?: string;
	};

	type Props = {
		items?: SearchOption[];
		/** Remote search. When set, `items` and Fuse are not used. */
		search?: (query: string) => Promise<SearchOption[]>;
		/** Label for the current value when the options are not loaded yet. */
		selectedLabel?: string;
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
		items = [],
		search,
		selectedLabel = '',
		name,
		value = '',
		placeholder = 'Search…',
		allowEmpty = false,
		emptyLabel = 'Any',
		required = false,
		id,
		class: className
	}: Props = $props();

	let remoteItems = $state<SearchOption[]>([]);
	// The effect below re-syncs when the parent reloads or resets the form.
	// svelte-ignore state_referenced_locally
	let selected = $state(value);
	let query = $state('');
	let open = $state(false);
	let requestId = 0;
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	const baseOptions = $derived(search ? remoteItems : items);

	const options = $derived<SearchOption[]>(
		allowEmpty ? [{ value: '', label: emptyLabel }, ...baseOptions] : baseOptions
	);

	const fuse = $derived(
		search
			? null
			: new Fuse(options, {
					keys: ['label', 'keywords'],
					threshold: 0.35,
					ignoreLocation: true,
					minMatchCharLength: 1
				})
	);

	const matches = $derived.by(() => {
		if (search) {
			return options;
		}

		const text = query.trim();

		return text === '' ? options : (fuse?.search(text).map((result) => result.item) ?? []);
	});

	// Re-sync when the parent reloads or resets the form. The option lookup is
	// untracked: remote results change on every keystroke and must not clear the
	// query the person is typing.
	$effect(() => {
		selected = value;
		query =
			selectedLabel ||
			untrack(() => options.find((option) => option.value === value)?.label) ||
			'';
	});

	function currentLabel(): string {
		return options.find((option) => option.value === selected)?.label ?? selectedLabel;
	}

	function handleOpenChange(nextOpen: boolean) {
		open = nextOpen;

		if (nextOpen) {
			query = '';

			if (search) {
				void loadOptions('');
			}

			return;
		}

		query = currentLabel();
	}

	async function loadOptions(text: string) {
		if (!search) {
			return;
		}

		const currentRequest = ++requestId;
		const results = await search(text);

		if (currentRequest === requestId) {
			remoteItems = results;
		}
	}

	function scheduleSearch(text: string) {
		if (!search) {
			return;
		}

		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => void loadOptions(text), 200);
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
		oninput={(event) => {
			query = event.currentTarget.value;
			scheduleSearch(query);
		}}
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
