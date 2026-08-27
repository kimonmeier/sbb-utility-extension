import { writable } from 'svelte/store';

export type PageType = 'home' | 'employees' |'settings';

export const currentPage = writable<PageType>('home');

export function navigateTo(page: PageType) {
  currentPage.set(page);
}
