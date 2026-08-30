import type { Component } from 'svelte';
import type { Icon } from '$lib/icons';

export type RowDefinition<T> = {
	id: string;
	data: T;
	calculateClasses?: (rowData: T) => string;
};

type BasicColumnDefinition<K> = {
	header: string;
	allowSorting?: boolean;
	sortFunction?: (a: K, b: K) => number;
	sortDirection?: 'asc' | 'desc';
};

type ColumnDataDefinition<K> = BasicColumnDefinition<K> & {
	type: 'data';
	accessor: keyof K;
};

type ColumnDataDisplayDefinition<K> = BasicColumnDefinition<K> & {
	type: 'display';
	render: (rowData: K) => string;
};

type ColumnButtonDefinition<K> = BasicColumnDefinition<K> & {
	type: 'button';
	buttonIcon: Component<Icon>;
	onClick: (rowData: K) => void;
};

type ColumnCalculatedDefinition<K> = BasicColumnDefinition<K> & {
	type: 'calculated';
	calculate: (rowData: K) => string;
};

export type ColumnDefinition<K> =
	| ColumnDataDefinition<K>
	| ColumnDataDisplayDefinition<K>
	| ColumnButtonDefinition<K>
	| ColumnCalculatedDefinition<K>;
