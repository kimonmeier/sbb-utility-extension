import { writable } from 'svelte/store';
import { getLocale, setLocale, locales } from '../../paraglide/runtime.js';

export type Locale = (typeof locales)[number];
export const AVAILABLE_LOCALES: Locale[] = [...locales];

export const locale = writable<Locale>(getLocale());

export function changeLocale(newLocale: Locale): void {
  setLocale(newLocale);
  locale.set(newLocale);
}
