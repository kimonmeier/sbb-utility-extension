import { writable, type Readable } from 'svelte/store';

type AlertItem = {
	id: string;
	message: string;
	type: 'success' | 'error' | 'info' | 'warning';
	duration?: number; // in milliseconds
};

interface AlertQueue extends Readable<AlertItem[]> {
	queue: (alert: Omit<AlertItem, 'id'>) => void;
}

export function createAlertQueue(): AlertQueue {
	const { subscribe, update } = writable<AlertItem[]>([]);

	return {
		subscribe,
		queue: (alert) => {
			const id = crypto.randomUUID();
			const newAlert: AlertItem = { ...alert, id };

			update((alerts) => [...alerts, newAlert]);

			setTimeout(() => {
				update((alerts) => alerts.filter((a) => a.id !== id));
			}, newAlert.duration ?? 2000);
		}
	};
}

export const alertQueue = createAlertQueue();
export const currentAlert = writable<AlertItem | null>(null);
