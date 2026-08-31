import { SopreTourType } from '$background/api/types/sopretypes';

/** Ein Eintrag im Wochenschema: entweder eine Tournummer oder RT / CT / RES. */
export const RUHETAG_EINTRAG = 'RT';
export const KOMPENSATIONSTAG_EINTRAG = 'CT';
export const RESERVE_EINTRAG = 'RES';

export interface PlanEintrag {
	/** Rohwert aus dem Plan. */
	eintrag: string;
	abkuerzung: SopreTourType | null;
	tourNumber: number | null;
}

/**
 * Das Wochenschema einer Gruppe. `wochen[w - 1][d]` ist der Eintrag der
 * Wochenfolge `w` am Wochentag `d` (0 = Sonntag .. 6 = Samstag).
 */
export interface Wochenschema {
	zyklusLaenge: number;
	/** Erster Tag des Plans, ein Sonntag, als "YYYY-MM-DD". */
	gueltigVon: string;
	/** Letzter Tag des Plans, ein Samstag, als "YYYY-MM-DD". */
	gueltigBis: string;
	wochen: string[][];
}

/**
 * Uebersetzt einen Planeintrag in die Felder, die eine Tourenzeile traegt.
 * Reserve-Tage kennen im Plan keine Schichtlage, deshalb der generische
 * Reserve-Typ.
 */
export function toPlanEintrag(eintrag: string): PlanEintrag {
	if (eintrag === RUHETAG_EINTRAG) {
		return { eintrag, abkuerzung: SopreTourType.RUHETAGE, tourNumber: null };
	}

	if (eintrag === KOMPENSATIONSTAG_EINTRAG) {
		return { eintrag, abkuerzung: SopreTourType.KOMPENSATIONSTAG, tourNumber: null };
	}

	if (eintrag === RESERVE_EINTRAG) {
		return { eintrag, abkuerzung: SopreTourType.RESERVE, tourNumber: null };
	}

	const tourNumber = Number.parseInt(eintrag, 10);
	if (Number.isNaN(tourNumber)) {
		return { eintrag, abkuerzung: SopreTourType.UNBEKANNT, tourNumber: null };
	}

	return { eintrag, abkuerzung: null, tourNumber };
}
