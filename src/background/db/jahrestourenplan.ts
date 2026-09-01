import { eq } from 'drizzle-orm';
import { db } from './db';
import { jahrestourenplan, jahrestourenplanWoche } from './schema';
import { toPlanEintrag } from '$background/caluclations/linie/types';
import {
	validiereJahrestourenplan,
	type JahrestourenplanDatei
} from '$background/caluclations/linie/plan-datei';
import { parseZonedDateTime } from '$background/caluclations/date-helper';
import { SopreDepot } from '$background/api/types/sopretypes';
import oltenPlan2026 from '$background/data/jahrestourenplaene/olten-2026.json';
import baselPlan2026 from '$background/data/jahrestourenplaene/basel-2026.json';
import aargauPlan2026 from '$background/data/jahrestourenplaene/aarau-2026.json';

/** Die im Repo mitgelieferten Plaene. */
const GEBUENDELTE_PLAENE: JahrestourenplanDatei[] = [
	oltenPlan2026 as JahrestourenplanDatei,
	baselPlan2026 as JahrestourenplanDatei,
	aargauPlan2026 as JahrestourenplanDatei
];

/**
 * Schreibt eine geprüfte Plandatei in die Datenbank. Idempotent: der Plankopf
 * wird pro (Depot, Gruppe, Jahr) aktualisiert, das Raster jedes Mal komplett
 * ersetzt.
 */
export async function speichereJahrestourenplan(datei: JahrestourenplanDatei): Promise<void> {
	const depot = (datei.depot as SopreDepot) ?? SopreDepot.UNBEKANNT;
	const gueltigVon = parseZonedDateTime(datei.gueltigVon);
	const gueltigBis = parseZonedDateTime(datei.gueltigBis);

	for (const gruppe of datei.gruppen) {
		const [gespeichert] = await db
			.insert(jahrestourenplan)
			.values({
				depot,
				gruppe: gruppe.gruppe,
				wochenschema: gruppe.wochenschema,
				jahr: datei.jahr,
				gueltigVon,
				gueltigBis,
				zyklusLaenge: gruppe.zyklusLaenge
			})
			.onConflictDoUpdate({
				target: [jahrestourenplan.depot, jahrestourenplan.gruppe, jahrestourenplan.jahr],
				set: {
					wochenschema: gruppe.wochenschema,
					gueltigVon,
					gueltigBis,
					zyklusLaenge: gruppe.zyklusLaenge
				}
			})
			.returning();

		await db.delete(jahrestourenplanWoche).where(eq(jahrestourenplanWoche.plan, gespeichert.id));

		await db.insert(jahrestourenplanWoche).values(
			gruppe.wochen.flatMap((woche, wochenIndex) =>
				woche.map((eintrag, wochentag) => {
					const { abkuerzung, tourNumber } = toPlanEintrag(eintrag);
					return {
						plan: gespeichert.id,
						wochenfolge: wochenIndex + 1,
						wochentag,
						eintrag,
						abkuerzung,
						tourNumber
					};
				})
			)
		);
	}
}

/** Spielt eine vom Nutzer gewaehlte Plandatei ein. */
export async function importiereJahrestourenplan(json: string): Promise<JahrestourenplanDatei> {
	const datei = validiereJahrestourenplan(JSON.parse(json));
	await speichereJahrestourenplan(datei);
	return datei;
}

/** Spielt die im Repo mitgelieferten Plaene ein. Laeuft bei jedem Start. */
export async function seedJahrestourenplaene(): Promise<void> {
	for (const datei of GEBUENDELTE_PLAENE) {
		await speichereJahrestourenplan(validiereJahrestourenplan(datei));
	}
}
