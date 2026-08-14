import { writable, get } from 'svelte/store';

// DaisyUI theme options
export type Theme =
  | 'light'
  | 'dark';

export const AVAILABLE_THEMES: Theme[] = [
  'light',
  'dark',
];

const STORAGE_KEY = 'sbb-utility-theme';

// Initialize from localStorage or default to 'light'
const storedTheme = (localStorage.getItem(STORAGE_KEY) as Theme) || 'light';
export const theme = writable<Theme>(storedTheme);

// Subscribe to save theme changes to localStorage
theme.subscribe((value) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, value);
  }
});

export function initializeTheme(): void {
  const currentTheme = get(theme);
  const root = document.querySelector('div[data-theme]');
  if (root) {
    root.setAttribute('data-theme', currentTheme);
  }
}

export function setTheme(newTheme: Theme): void {
  theme.set(newTheme);
  const root = document.querySelector('div[data-theme]');
  if (root) {
    root.setAttribute('data-theme', newTheme);
  }
}

export function toggleTheme(): void {
  theme.update((current) => {
    const newTheme: Theme = current === 'light' ? 'dark' : 'light';
    const root = document.querySelector('div[data-theme]');
    if (root) {
      root.setAttribute('data-theme', newTheme);
    }
    return newTheme;
  });
}
