import type { MenuItem } from '../types';
import { Home, Settings, HelpCircle, Layers } from '../icons';
import { navigateTo } from '../stores/navigation';

export const MENU_ITEMS: MenuItem[] = [
  { icon: Home, label: 'Home', action: () => navigateTo('home') },
  { icon: Settings, label: 'Settings', action: () => navigateTo('settings') },
];