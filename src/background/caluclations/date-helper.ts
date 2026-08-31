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

export function coundDaysinYear(year: number): number {
	const start = new Date(Date.UTC(year, 0, 1));
	const end = new Date(Date.UTC(year + 1, 0, 1));
	const diffInMs = end.getTime() - start.getTime();
	return diffInMs / (1000 * 60 * 60 * 24);
}

export const TIME_ZONE = 'Europe/Zurich';

export function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	}).formatToParts(date);

	const lookup: Record<string, string> = {};
	for (const part of parts) {
		lookup[part.type] = part.value;
	}

	const asUtc = Date.UTC(
		Number(lookup.year),
		Number(lookup.month) - 1,
		Number(lookup.day),
		Number(lookup.hour),
		Number(lookup.minute),
		Number(lookup.second)
	);

	return (asUtc - date.getTime()) / 60_000;
}

/**
 * Wandelt ein Datum bzw. eine Datumszeit aus der SBB-API in den Zeitpunkt um,
 * den sie in Europe/Zurich bezeichnet. Ein reines Datum wird damit zur lokalen
 * Mitternacht -- und genau so liegen die Touren in der Datenbank.
 */
export function parseZonedDateTime(value: string): Date {
	const match = value
		.trim()
		.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
	if (!match) {
		throw new Error(`Unrecognized date/time value from SBB API: "${value}"`);
	}

	const [, year, month, day, hour, minute, second] = match;
	const utcGuess = Date.UTC(
		Number(year),
		Number(month) - 1,
		Number(day),
		hour ? Number(hour) : 0,
		minute ? Number(minute) : 0,
		second ? Number(second) : 0
	);

	const offsetMinutes = getTimeZoneOffsetMinutes(new Date(utcGuess), TIME_ZONE);
	return new Date(utcGuess - offsetMinutes * 60_000);
}

/**
 * Der Kalendertag, auf den ein Zeitpunkt in Europe/Zurich faellt, als
 * "YYYY-MM-DD". Notwendig, weil die Touren als lokale Mitternacht gespeichert
 * sind: im Sommer liegt die zwei Stunden vor UTC-Mitternacht, `toISOString`
 * wuerde also den Vortag liefern.
 */
export function toZonedDateKey(date: Date): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(date);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
	const [year, month, day] = dateKey.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** 0 = Sonntag .. 6 = Samstag, bezogen auf den Kalendertag in Europe/Zurich. */
export function weekdayOfDateKey(dateKey: string): number {
	return new Date(`${dateKey}T00:00:00Z`).getUTCDay();
}

/** Ganze Tage zwischen zwei Kalendertagen, unabhaengig von Zeitzone und DST. */
export function daysBetweenDateKeys(from: string, to: string): number {
	return toUtcDayNumberFromDateKey(to) - toUtcDayNumberFromDateKey(from);
}
