<script lang="ts" generics="K">
	import Icon from '$lib/components/Icon.svelte';
	import Button from './Button.svelte';
	import { type ColumnDefinition, type RowDefinition } from './Table.types.ts';

	let {
		data,
		columnDefinition,
		onClick
	}: {
		data: RowDefinition<K>[];
		columnDefinition: ColumnDefinition<K>[];
		onClick?: (row: RowDefinition<K>) => void;
	} = $props();

	function handleSort(column: ColumnDefinition<K>) {
		if (!column.allowSorting) {
			return;
		}

		columnDefinition = columnDefinition.map<ColumnDefinition<K>>((col) => {
			if (col === column) {
				if (!col.sortDirection) {
					return { ...col, sortDirection: 'asc' };
				} else if (col.sortDirection === 'asc') {
					return { ...col, sortDirection: 'desc' };
				}

				return { ...col, sortDirection: undefined };
			}
			return { ...col, sortDirection: undefined };
		});
	}

	let sortedRows = $derived.by(() => {
		return [...data].sort((a, b) => {
			const sortedColumn = columnDefinition.find((col) => col.sortDirection);
			if (!sortedColumn) {
				return 0;
			}

			const multiplier = sortedColumn.sortDirection === 'asc' ? 1 : -1;

			return sortedColumn.sortFunction ? sortedColumn.sortFunction(a.data, b.data) * multiplier : 0;
		});
	});
</script>

{#snippet row(row: RowDefinition<K>, caluclateClasses: (row: K) => string = () => '')}
	<tr
		onclick={() => onClick?.(row)}
		class="duration-sbb ease-sbb hover:bg-base-200 transition-colors {onClick
			? 'cursor-pointer'
			: ''} {caluclateClasses(row.data)}"
	>
		{@render rowDisplay(row.data)}
	</tr>
{/snippet}

{#snippet rowDisplay(row: K)}
	{#each columnDefinition as column (column.header)}
		{#if column.type === 'button'}
			<td>
				<Button variant="primary" size="sm" onclick={() => column.onClick(row)}>
					<Icon icon={column.buttonIcon} size={16} />
				</Button>
			</td>
		{:else if column.type === 'display'}
			<td>
				{column.render(row)}
			</td>
		{:else if column.type === 'calculated'}
			<td>
				{column.calculate(row)}
			</td>
		{:else}
			<td>{row[column.accessor]}</td>
		{/if}
	{/each}
{/snippet}

<table class="table w-full">
	<thead>
		<tr>
			{#each columnDefinition as column (column.header)}
				<th onclick={() => handleSort(column)}
					>{column.header}
					{#if column.sortDirection === 'asc'}▲{:else if column.sortDirection === 'desc'}▼{/if}</th
				>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each sortedRows as entry (entry.id)}
			{@render row(entry, entry.calculateClasses)}
		{/each}
	</tbody>
</table>
