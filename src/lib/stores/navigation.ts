import { writable } from 'svelte/store';

export interface NavigationState {
	currentPage: PageType;
	detailId?: string;
}

export type PageType = 'home' | 'employees' | 'settings';

export const currentPage = writable<NavigationState>({
	currentPage: 'home'
});

export function navigateTo(page: PageType, detailId?: string) {
	currentPage.set({
		currentPage: page,
		detailId: detailId
	});
}
