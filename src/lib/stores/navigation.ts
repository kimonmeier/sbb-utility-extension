import { writable } from 'svelte/store';

export type PageType = 'home' | 'settings';

export const currentPage = writable<PageType>('home');

export function navigateTo(page: PageType) {
  currentPage.set(page);
}
