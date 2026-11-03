<script lang="ts">
	/**
	 * Filter bar for `/jobs`.
	 *
	 * A plain GET form: the filters live in the URL, the page works without JavaScript, and a
	 * shared link reproduces the same result. The controls are shadcn-svelte components so the
	 * focus, disabled and invalid states match the rest of the UI.
	 */

	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Checkbox } from '#lib/components/ui/checkbox/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { NativeSelect, NativeSelectOption } from '#lib/components/ui/native-select/index.ts';
	import type { Category } from '#lib/api/types.ts';

	type Filters = {
		query?: string;
		categoryId?: string;
		location?: string;
		sort: 'newest' | 'salary_desc';
		verifiedOnly: boolean;
	};

	let { categories, filters }: { categories: Category[]; filters: Filters } = $props();
</script>

<form
	action={resolve('/jobs')}
	class="grid gap-3 border border-rule bg-card p-4 sm:grid-cols-2 lg:grid-cols-6"
	method="GET"
>
	<div class="lg:col-span-2">
		<Label class="mb-1" for="job-q">Keyword</Label>
		<Input
			class="bg-card"
			id="job-q"
			name="q"
			placeholder="Barista, tutor, event staff"
			type="search"
			value={filters.query ?? ''}
		/>
	</div>

	<div>
		<Label class="mb-1" for="job-category">Category</Label>
		<NativeSelect
			class="w-full"
			id="job-category"
			name="categoryId"
			value={filters.categoryId ?? ''}
		>
			<NativeSelectOption value="">Any category</NativeSelectOption>
			{#each categories as category (category.id)}
				<NativeSelectOption value={category.id}>{category.name}</NativeSelectOption>
			{/each}
		</NativeSelect>
	</div>

	<div>
		<Label class="mb-1" for="job-location">Location</Label>
		<Input
			class="bg-card"
			id="job-location"
			name="location"
			placeholder="Hanoi"
			value={filters.location ?? ''}
		/>
	</div>

	<div>
		<Label class="mb-1" for="job-sort">Sort</Label>
		<NativeSelect class="w-full" id="job-sort" name="sort" value={filters.sort}>
			<NativeSelectOption value="newest">Newest first</NativeSelectOption>
			<NativeSelectOption value="salary_desc">Highest pay</NativeSelectOption>
		</NativeSelect>
	</div>

	<div class="flex flex-col justify-end gap-2">
		<div class="flex items-center gap-2">
			<Checkbox checked={filters.verifiedOnly} id="job-verified" name="verifiedOnly" value="true" />
			<Label for="job-verified">Verified employers</Label>
		</div>
		<Button class="w-full" type="submit">Search shifts</Button>
	</div>
</form>
