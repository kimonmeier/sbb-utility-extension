<script lang="ts" generics="T">
	import type { SelectItem } from './Select.types';

	type Props<T> = {
		className?: string;
		id?: string;
		items: SelectItem<T>[];
		value?: T | null;
		placeholder?: string;
		onchange?: (event: CustomEvent<T | null>) => void;
	};

	let {
		className,
		id,
		items = [],
		value = $bindable(null),
		onchange,
		placeholder
	}: Props<T> = $props();
</script>

<select
	{id}
	class="select select-bordered w-full {className}"
	bind:value
	onchange={(event) => {
		if (!(event.target instanceof HTMLSelectElement)) {
			return;
		}

		const selectedValue = event.target.value;
		const selectedItem = items.find((item) => item.value === selectedValue);
		onchange?.(new CustomEvent('change', { detail: selectedItem ? selectedItem.value : null }));
	}}
>
	{#if placeholder}
		<option value="" disabled selected>{placeholder}</option>
	{/if}
	{#each items as item (item.value)}
		<option value={item.value} selected={item.value === value}>{item.label}</option>
	{/each}
</select>
