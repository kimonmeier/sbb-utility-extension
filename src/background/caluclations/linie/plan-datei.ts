/**
 * Aufbau und Pruefung der Jahrestourenplan-Dateien -- sowohl der im Repo
 * mitgelieferten als auch der vom Nutzer importierten.
 */

/** Aufbau der gebuendelten bzw. importierten Plandateien. */
export interface JahrestourenplanDatei {
	version: number;
	depot: string;
	jahr: number;
	gueltigVon: string;
	gueltigBis: string;
	gruppen: {
		gruppe: string;
		wochenschema: string;
		zyklusLaenge: number;
		wochen: string[][];
	}[];
}

const UNTERSTUETZTE_VERSION = 1;
const TAGE_PRO_WOCHE = 7;
const DATUM_MUSTER = /^\d{4}-\d{2}-\d{2}$/;
const EINTRAG_MUSTER = /^(RT|CT|RES|\d+)$/;

/**
 * Prueft eine Plandatei, bevor sie in die Datenbank geht. Ein halb eingelesener
 * Plan wuerde stillschweigend falsche Ruhetage erzeugen, deshalb lieber hart
 * ablehnen als raten.
 */
export function validiereJahrestourenplan(datei: unknown): JahrestourenplanDatei {
	const plan = datei as JahrestourenplanDatei;

	if (!plan || typeof plan !== 'object') {
		throw new Error('Plandatei ist kein Objekt.');
	}

	if (plan.version !== UNTERSTUETZTE_VERSION) {
		throw new Error(
			`Nicht unterstuetzte Version ${plan.version}, erwartet ${UNTERSTUETZTE_VERSION}.`
		);
	}

	if (!DATUM_MUSTER.test(plan.gueltigVon) || !DATUM_MUSTER.test(plan.gueltigBis)) {
		throw new Error('gueltigVon/gueltigBis muessen im Format YYYY-MM-DD vorliegen.');
	}

	if (!Number.isInteger(plan.jahr)) {
		throw new Error('jahr fehlt oder ist keine ganze Zahl.');
	}

	if (!Array.isArray(plan.gruppen) || plan.gruppen.length === 0) {
		throw new Error('Plandatei enthaelt keine Gruppen.');
	}

	for (const gruppe of plan.gruppen) {
		if (!gruppe.gruppe || !gruppe.wochenschema) {
			throw new Error('Einer Gruppe fehlt Name oder Wochenschema.');
		}

		if (!Array.isArray(gruppe.wochen) || gruppe.wochen.length !== gruppe.zyklusLaenge) {
			throw new Error(
				`${gruppe.gruppe}: ${gruppe.wochen?.length ?? 0} Wochen, erwartet ${gruppe.zyklusLaenge}.`
			);
		}

		for (const [index, woche] of gruppe.wochen.entries()) {
			if (!Array.isArray(woche) || woche.length !== TAGE_PRO_WOCHE) {
				throw new Error(`${gruppe.gruppe}, Woche ${index + 1}: erwartet 7 Eintraege.`);
			}

			for (const eintrag of woche) {
				if (typeof eintrag !== 'string' || !EINTRAG_MUSTER.test(eintrag)) {
					throw new Error(
						`${gruppe.gruppe}, Woche ${index + 1}: ungueltiger Eintrag "${eintrag}".`
					);
				}
			}
		}
	}

	return plan;
}
