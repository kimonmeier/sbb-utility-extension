export function toDateString(timestampMs: number): string {
	return new Date(timestampMs).toISOString().slice(0, 10);
}

export function toUtcDayNumberFromDateKey(dateKey: string): number {
	return Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / 86400000);
}

export function toDateKeyFromUtcDayNumber(dayNumber: number): string {
	return new Date(dayNumber * 86400000).toISOString().slice(0, 10);
}

export function countSaturdaysInYear(year: number): number {
	let count = 0;
	for (let month = 0; month < 12; month += 1) {
		const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
		for (let day = 1; day <= daysInMonth; day += 1) {
			const weekday = new Date(Date.UTC(year, month, day)).getUTCDay();
			if (weekday === 6) {
				count += 1;
			}
		}
	}

	return count;
}
