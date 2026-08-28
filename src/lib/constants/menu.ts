import type { MenuItem } from '$lib/types';
import { Home, PersonStanding, Settings } from '$lib/icons';
import { navigateTo } from '$lib/stores/navigation';
import { m } from '@/paraglide/messages.js';

export const MENU_ITEMS: MenuItem[] = [
	{ icon: Home, label: m.nav_home, page: 'home', action: () => navigateTo('home') },
	{
		icon: PersonStanding,
		label: m.nav_employees,
		page: 'employees',
		action: () => navigateTo('employees')
	},
	{ icon: Settings, label: m.nav_settings, page: 'settings', action: () => navigateTo('settings') }
];
