import { writable } from 'svelte/store';

const STORAGE_KEY = 'sbb-utility-expert-mode';

const storedValue =
	typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true';

export const expertMode = writable<boolean>(storedValue);

expertMode.subscribe((value) => {
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(STORAGE_KEY, String(value));
	}
});
