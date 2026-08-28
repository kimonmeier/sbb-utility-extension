import type { Component } from 'svelte';
import type { Icon } from '$lib/icons';

type BasicColumnDefinition<T> = {
	header: string;
	allowSorting?: boolean;
	sortFunction?: (a: T, b: T) => number;
	sortDirection?: 'asc' | 'desc';
};

type ColumnDataDefinition<T> = BasicColumnDefinition<T> & {
	type: 'data';
	accessor: keyof T;
};

type ColumnDataDisplayDefinition<T> = BasicColumnDefinition<T> & {
	type: 'display';
	render: (rowData: T) => string;
};

type ColumnButtonDefinition<T> = BasicColumnDefinition<T> & {
	type: 'button';
	buttonIcon: Component<Icon>;
	onClick: (rowData: T) => void;
};

export type ColumnDefinition<T> =
	ColumnDataDefinition<T> | ColumnDataDisplayDefinition<T> | ColumnButtonDefinition<T>;
