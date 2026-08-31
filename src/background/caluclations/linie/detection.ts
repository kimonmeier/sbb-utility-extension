import { SopreTourType } from '$background/api/types/sopretypes';
import { isReserveType } from '$background/caluclations/tour-helper';
import { planTagFor } from './rotation';
import {
	KOMPENSATIONSTAG_EINTRAG,
	RESERVE_EINTRAG,
	RUHETAG_EINTRAG,
	type Wochenschema
} from './types';

/** Ein Tag aus den synchronisierten Daten, reduziert auf das Vergleichbare. */
export interface ErkennungsTag {
	dateKey: string;
	abkuerzung: SopreTourType | null;
	tourNumber: number | null;
}

/**
 * Tage, die den Plan ueberschreiben und deshalb weder als Treffer noch als
 * Fehltreffer zaehlen: Abwesenheiten sowie getauschte und verlangte Ruhe- bzw.
 * Kompensationstage, die per Definition vom Plan abweichen.
 */
const NICHT_BEWERTBAR: ReadonlySet<string> = new Set<string>([
	SopreTourType.FERIEN,
	SopreTourType.KRANK,
	SopreTourType.NICHTBERUFSUNFALL,
	SopreTourType.BERUFSUNFALL,
	SopreTourType.UNBEZAHLTER_URLAUB,
	SopreTourType.WOHNUNGSWECHSEL,
	SopreTourType.RUHETAG_VERLANGT,
	SopreTourType.RUHETAG_TAUSCH,
	SopreTourType.KOMPENSATIONSTAG_VERLANGT,
	SopreTourType.KOMPENSATIONSTAG_TAUSCH,
	SopreTourType.GUTHABEN_RUHETAG_PERSONAL,
	SopreTourType.GUTHABEN_KOMPENSATIONSTAG_PERSONAL,
	SopreTourType.UNBEKANNT
]);

/** Weniger Tage tragen keine belastbare Aussage. */
export const MIN_BEWERTBARE_TAGE = 60;
/** Ab dieser Trefferquote gilt eine Linie als erkannt. */
export const MIN_TREFFERQUOTE = 0.6;
/** Mindestabstand zur zweitbesten Linie, sonst ist das Ergebnis mehrdeutig. */
export const MIN_ABSTAND = 0.1;

export type ErkennungsErgebnis =
	| {
			kind: 'erkannt';
			linie: number;
			trefferquote: number;
			bewertbareTage: number;
	  }
	| {
			kind: 'unklar';
			grund: 'zu-wenig-daten' | 'keine-uebereinstimmung' | 'mehrdeutig';
			bewertbareTage: number;
			besteTrefferquote: number;
	  };

export function istBewertbar(tag: ErkennungsTag): boolean {
	if (tag.abkuerzung !== null && NICHT_BEWERTBAR.has(tag.abkuerzung)) {
		return false;
	}

	// Ohne Abkuerzung und ohne Tournummer gibt der Tag nichts her.
	return tag.abkuerzung !== null || tag.tourNumber !== null;
}

/**
 * Passt ein Tag zum Planeintrag?
 *
 * Bewusst strikt: `isRuhetagType` / `isKompensationstagType` wuerden auch
 * getauschte und verlangte Tage einschliessen, die vom Plan abweichen duerfen.
 * Die sind hier bereits aussortiert.
 */
export function passtZuEintrag(tag: ErkennungsTag, eintrag: string): boolean {
	if (eintrag === RUHETAG_EINTRAG) {
		return tag.abkuerzung === SopreTourType.RUHETAGE;
	}

	if (eintrag === KOMPENSATIONSTAG_EINTRAG) {
		return tag.abkuerzung === SopreTourType.KOMPENSATIONSTAG;
	}

	if (eintrag === RESERVE_EINTRAG) {
		return isReserveType(tag.abkuerzung);
	}

	return tag.tourNumber !== null && String(tag.tourNumber) === eintrag;
}

/**
 * Ermittelt die Linie, deren Tourenablauf am besten zu den tatsaechlich
 * synchronisierten Tagen passt.
 *
 * Nur Tage innerhalb der Plangueltigkeit werden bewertet -- alles davor oder
 * danach gehoert zu einem anderen Jahrestourenplan.
 */
export function erkenneLinie(schema: Wochenschema, tage: ErkennungsTag[]): ErkennungsErgebnis {
	const bewertbar = tage.filter(
		(tag) =>
			istBewertbar(tag) && tag.dateKey >= schema.gueltigVon && tag.dateKey <= schema.gueltigBis
	);

	if (bewertbar.length < MIN_BEWERTBARE_TAGE) {
		return {
			kind: 'unklar',
			grund: 'zu-wenig-daten',
			bewertbareTage: bewertbar.length,
			besteTrefferquote: 0
		};
	}

	const quoten: number[] = [];
	for (let linie = 1; linie <= schema.zyklusLaenge; linie += 1) {
		let treffer = 0;
		for (const tag of bewertbar) {
			if (passtZuEintrag(tag, planTagFor(schema, linie, tag.dateKey).eintrag)) {
				treffer += 1;
			}
		}
		quoten.push(treffer / bewertbar.length);
	}

	const beste = Math.max(...quoten);
	const linie = quoten.indexOf(beste) + 1;
	const zweitbeste = Math.max(...quoten.filter((_, index) => index + 1 !== linie), 0);

	if (beste < MIN_TREFFERQUOTE) {
		return {
			kind: 'unklar',
			grund: 'keine-uebereinstimmung',
			bewertbareTage: bewertbar.length,
			besteTrefferquote: beste
		};
	}

	if (beste - zweitbeste < MIN_ABSTAND) {
		return {
			kind: 'unklar',
			grund: 'mehrdeutig',
			bewertbareTage: bewertbar.length,
			besteTrefferquote: beste
		};
	}

	return { kind: 'erkannt', linie, trefferquote: beste, bewertbareTage: bewertbar.length };
}
