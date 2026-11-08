<script lang="ts">
	/**
	 * Location picker backed by the server's canonical list.
	 *
	 * The list is never bundled: the combobox asks `/api/v1/locations` as the
	 * person types, and the form stores the selected location id. A free-text
	 * value cannot be submitted.
	 */

	import type { Location } from '#lib/api/types.ts';
	import SearchSelect from './SearchSelect.svelte';

	type Props = {
		name: string;
		value?: string;
		selectedLabel?: string;
		allowEmpty?: boolean;
		emptyLabel?: string;
		required?: boolean;
		id?: string;
	};

	let {
		name,
		value = '',
		selectedLabel = '',
		allowEmpty = false,
		emptyLabel = 'Any location',
		required = false,
		id
	}: Props = $props();

	let fetchedLabel = $state('');
	const label = $derived(selectedLabel || fetchedLabel);

	$effect(() => {
		fetchedLabel = '';

		if (value === '' || selectedLabel !== '') {
			return;
		}

		let cancelled = false;

		void (async () => {
			try {
				const response = await fetch(`/api/v1/locations/${value}`);

				if (!response.ok) {
					return;
				}

				const location: Location = await response.json();

				if (!cancelled) {
					fetchedLabel = location.name;
				}
			} catch {
				// Keep the id; the server still validates it on save.
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	async function search(query: string) {
		try {
			const params = new URLSearchParams({ q: query, limit: '8' });
			const response = await fetch(`/api/v1/locations?${params}`);

			if (!response.ok) {
				return [];
			}

			const locations: Location[] = await response.json();

			return locations.map((location) => ({
				value: location.id,
				label: location.name,
				keywords: `${location.displayName} ${location.countryName}`
			}));
		} catch {
			return [];
		}
	}
</script>

<SearchSelect
	{name}
	{value}
	{id}
	{required}
	{allowEmpty}
	{emptyLabel}
	selectedLabel={label}
	{search}
	placeholder="Search cities"
/>
