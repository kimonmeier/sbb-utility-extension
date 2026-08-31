import { daysBetweenDateKeys, weekdayOfDateKey } from '$background/caluclations/date-helper';
import type { Wochenschema } from './types';

/**
 * Der 0-basierte Wochenindex eines Tages, gezaehlt ab dem ersten Tag des Plans.
 *
 * Der Index darf ueber das Planende hinauslaufen -- genau das ist die
 * Hochrechnung: nach dem letzten publizierten Tag zaehlt man auf der Linie
 * einfach weiter.
 */
export function weekIndexForDateKey(gueltigVon: string, dateKey: string): number {
	return Math.floor(daysBetweenDateKeys(gueltigVon, dateKey) / 7);
}

/**
 * Die Wochenfolge, auf der eine Linie in einer bestimmten Planwoche steht.
 *
 * Die "Wochenfolge"-Tabelle des Jahrestourenplans ist eine reine zyklische
 * Verschiebung: Linie L startet auf Wochenfolge L und rueckt pro Woche um eins
 * weiter, mit Umbruch von N auf 1.
 */
export function wochenfolgeFor(linie: number, weekIndex: number, zyklusLaenge: number): number {
	const shifted = (linie - 1 + weekIndex) % zyklusLaenge;
	// JS liefert bei negativem Dividenden ein negatives Ergebnis.
	return ((shifted + zyklusLaenge) % zyklusLaenge) + 1;
}

export interface PlanTag {
	wochenfolge: number;
	/** 0 = Sonntag .. 6 = Samstag. */
	wochentag: number;
	eintrag: string;
}

/** Der Planeintrag einer Linie an einem bestimmten Kalendertag. */
export function planTagFor(schema: Wochenschema, linie: number, dateKey: string): PlanTag {
	const weekIndex = weekIndexForDateKey(schema.gueltigVon, dateKey);
	const wochenfolge = wochenfolgeFor(linie, weekIndex, schema.zyklusLaenge);
	const wochentag = weekdayOfDateKey(dateKey);

	return { wochenfolge, wochentag, eintrag: schema.wochen[wochenfolge - 1][wochentag] };
}
