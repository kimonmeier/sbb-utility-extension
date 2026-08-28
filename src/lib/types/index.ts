import type { Component } from 'svelte';
import type { PageType } from '$lib/stores/navigation';
import type Icon from '$lib/components/Icon.svelte';

export interface MenuItem {
	icon: Component<Icon>;
	label: () => string;
	page: PageType;
	action?: () => void;
}
