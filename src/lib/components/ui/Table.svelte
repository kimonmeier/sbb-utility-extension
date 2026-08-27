<script lang="ts" generics="T">
	import Icon from '../Icon.svelte';
	import Button from './Button.svelte';
	import type { ColumnDefinition } from './Table.svelte.ts';

    let { data, columnDefinition }:{
        data: T[];
        columnDefinition: ColumnDefinition<T>[];
    } = $props();

    function handleSort(column: ColumnDefinition<T>) {
        if (!column.allowSorting) {
            return;
        }

        columnDefinition = columnDefinition.map<ColumnDefinition<T>>(col => {
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

    let sortedRows = $derived(() => {
        return data.sort((a, b) => {
            const sortedColumn = columnDefinition.find(col => col.sortDirection);
            if (!sortedColumn) { 
                return 0;
            }

            const multiplier = sortedColumn.sortDirection === "asc" ? 1 : -1;

            return sortedColumn.sortFunction
                ? sortedColumn.sortFunction(a, b) * multiplier
                : 0;
        });
    })
</script>

<table class="table w-full">
    <thead>
        <tr>
            {#each columnDefinition as column}
                <th onclick={() => handleSort(column)}>{column.header} {#if column.sortDirection === 'asc'}▲{:else if column.sortDirection === 'desc'}▼{/if}</th>
            {/each}
        </tr>
    </thead>
    <tbody>
        {#each sortedRows() as row}
            <tr>
                {#each columnDefinition as column}
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
                    {:else}
                        <td>{row[column.accessor]}</td>
                    {/if}
                {/each}
            </tr>
        {/each}
    </tbody>
</table>