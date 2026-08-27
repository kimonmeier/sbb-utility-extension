import type { Component } from 'svelte';
import type { PageType } from '../stores/navigation';

export interface MenuItem {
  icon: Component<any>;
  label: () => string;
  page: PageType;
  action?: () => void;
}