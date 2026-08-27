import type { MenuItem } from '../types';
import { Home, PersonStanding, Settings } from '../icons';
import { navigateTo } from '../stores/navigation';

export const MENU_ITEMS: MenuItem[] = [
  { icon: Home, label: 'Home', action: () => navigateTo('home') },
  { icon: PersonStanding, label: 'Employees', action: () => navigateTo('employees') },
  { icon: Settings, label: 'Settings', action: () => navigateTo('settings') },
];