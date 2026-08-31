import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '$background/db/db';
import {
	employeeLinie,
	hochrechnungTouren,
	jahrestourenplan,
	jahrestourenplanWoche,
	touren
} from '$background/db/schema';
import type { TourRow } from '$background/caluclations/types';
import {
	addDaysToDateKey,
	parseZonedDateTime,
	toZonedDateKey
} from '$background/caluclations/date-helper';
import { erkenneLinie, type ErkennungsErgebnis, type ErkennungsTag } from './detection';
import { hochrechnen } from './projection';
import type { Wochenschema } from './types';

type JahrestourenplanRow = typeof jahrestourenplan.$inferSelect;

/** Anfang und Ende eines Kalenderjahres als Zeitpunkte in Europe/Zurich. */
function jahresGrenzen(jahr: number): { von: Date; bis: Date } {
	return { von: parseZonedDateTime(`${jahr}-01-01`), bis: parseZonedDateTime(`${jahr}-12-31`) };
}

export async function ladeWochenschema(plan: JahrestourenplanRow): Promise<Wochenschema> {
	const eintraege = await db.query.jahrestourenplanWoche.findMany({
		where: eq(jahrestourenplanWoche.plan, plan.id)
	});

	const wochen: string[][] = Array.from({ length: plan.zyklusLaenge }, () => Array(7).fill(''));
	for (const eintrag of eintraege) {
		wochen[eintrag.wochenfolge - 1][eintrag.wochentag] = eintrag.eintrag;
	}

	return {
		zyklusLaenge: plan.zyklusLaenge,
		gueltigVon: toZonedDateKey(plan.gueltigVon),
		gueltigBis: toZonedDateKey(plan.gueltigBis),
		wochen
	};
}

async function ladeErkennungsTage(employeeId: string, jahr: number): Promise<ErkennungsTag[]> {
	const { von, bis } = jahresGrenzen(jahr);
	const rows = await db
		.select()
		.from(touren)
		.where(and(eq(touren.employee, employeeId), gte(touren.datum, von), lte(touren.datum, bis)));

	return rows.map((row) => ({
		dateKey: toZonedDateKey(row.datum),
		abkuerzung: row.abkuerzung,
		tourNumber: row.tourNumber
	}));
}

export interface LinienErkennung {
	plan: JahrestourenplanRow;
	ergebnis: ErkennungsErgebnis;
}

/**
 * Bewertet den Tourenablauf eines Mitarbeiters gegen jede Gruppe des Jahres.
 * Zurueck kommt ein Ergebnis pro Gruppe, damit auch ein Misserfolg erklaerbar
 * bleibt.
 */
export async function bewerteAlleGruppen(
	employeeId: string,
	jahr: number
): Promise<LinienErkennung[]> {
	const plaene = await db.query.jahrestourenplan.findMany({
		where: eq(jahrestourenplan.jahr, jahr)
	});

	if (plaene.length === 0) {
		return [];
	}

	const tage = await ladeErkennungsTage(employeeId, jahr);

	return Promise.all(
		plaene.map(async (plan) => ({
			plan,
			ergebnis: erkenneLinie(await ladeWochenschema(plan), tage)
		}))
	);
}

/**
 * Ermittelt die Linie automatisch und speichert sie. Eine manuell gesetzte
 * Zuweisung bleibt unangetastet; findet die Erkennung nichts Eindeutiges, wird
 * eine frueher automatisch gesetzte Zuweisung wieder entfernt, damit keine
 * veraltete Linie weiterlebt.
 */
export async function erkenneUndSpeichereLinie(employeeId: string, jahr: number): Promise<void> {
	const bestehend = await db.query.employeeLinie.findFirst({
		where: and(eq(employeeLinie.employee, employeeId), eq(employeeLinie.jahr, jahr))
	});

	if (bestehend?.quelle === 'MANUAL') {
		return;
	}

	const bewertungen = await bewerteAlleGruppen(employeeId, jahr);
	const treffer = bewertungen
		.filter((bewertung) => bewertung.ergebnis.kind === 'erkannt')
		.sort((a, b) => {
			const links = a.ergebnis as Extract<ErkennungsErgebnis, { kind: 'erkannt' }>;
			const rechts = b.ergebnis as Extract<ErkennungsErgebnis, { kind: 'erkannt' }>;
			return rechts.trefferquote - links.trefferquote;
		});

	const beste = treffer[0];
	if (!beste || beste.ergebnis.kind !== 'erkannt') {
		if (bestehend) {
			await db.delete(employeeLinie).where(eq(employeeLinie.id, bestehend.id));
		}
		return;
	}

	await db
		.insert(employeeLinie)
		.values({
			employee: employeeId,
			jahr,
			plan: beste.plan.id,
			linie: beste.ergebnis.linie,
			quelle: 'AUTO',
			trefferquote: Math.round(beste.ergebnis.trefferquote * 100),
			erkanntAm: new Date()
		})
		.onConflictDoUpdate({
			target: [employeeLinie.employee, employeeLinie.jahr],
			set: {
				plan: beste.plan.id,
				linie: beste.ergebnis.linie,
				quelle: 'AUTO',
				trefferquote: Math.round(beste.ergebnis.trefferquote * 100),
				erkanntAm: new Date()
			}
		});
}

/**
 * Erzeugt die hochgerechneten Tage fuer ein Jahr neu.
 *
 * Immer loeschen und neu schreiben: sobald die SBB weitere Touren publiziert,
 * rueckt der letzte echte Tag nach hinten und die betroffenen Prognosetage
 * verschwinden von selbst.
 */
export async function erzeugeHochrechnung(employeeId: string, jahr: number): Promise<void> {
	await db
		.delete(hochrechnungTouren)
		.where(and(eq(hochrechnungTouren.employee, employeeId), eq(hochrechnungTouren.jahr, jahr)));

	const zuweisung = await db.query.employeeLinie.findFirst({
		where: and(eq(employeeLinie.employee, employeeId), eq(employeeLinie.jahr, jahr))
	});

	if (!zuweisung) {
		return;
	}

	const plan = await db.query.jahrestourenplan.findFirst({
		where: eq(jahrestourenplan.id, zuweisung.plan)
	});

	if (!plan) {
		return;
	}

	const { von, bis } = jahresGrenzen(jahr);
	const echteTage = await db
		.select({ datum: touren.datum })
		.from(touren)
		.where(and(eq(touren.employee, employeeId), gte(touren.datum, von), lte(touren.datum, bis)));

	if (echteTage.length === 0) {
		return;
	}

	const letzterEchterTag = echteTage
		.map((tag) => toZonedDateKey(tag.datum))
		.reduce((links, rechts) => (rechts > links ? rechts : links));

	const ersterHochgerechnet = addDaysToDateKey(letzterEchterTag, 1);
	const jahresEnde = `${jahr}-12-31`;
	if (ersterHochgerechnet > jahresEnde) {
		return;
	}

	const schema = await ladeWochenschema(plan);
	const tage = hochrechnen(schema, zuweisung.linie, ersterHochgerechnet, jahresEnde);
	if (tage.length === 0) {
		return;
	}

	await db.insert(hochrechnungTouren).values(
		tage.map((tag) => ({
			employee: employeeId,
			jahr,
			datum: parseZonedDateTime(tag.dateKey),
			abkuerzung: tag.abkuerzung,
			tourNumber: tag.tourNumber,
			linie: zuweisung.linie,
			wochenfolge: tag.wochenfolge,
			wochentag: tag.wochentag,
			generiertAm: new Date()
		}))
	);
}

/**
 * Erzeugt die Hochrechnung fuer jede bestehende Zuweisung neu. Gebraucht nach
 * einem Datenbank-Import: die Prognosetage sind abgeleitet und werden deshalb
 * nicht mitgesichert.
 */
export async function erzeugeHochrechnungFuerAlle(): Promise<void> {
	const zuweisungen = await db.query.employeeLinie.findMany();

	for (const zuweisung of zuweisungen) {
		await erzeugeHochrechnung(zuweisung.employee, zuweisung.jahr);
	}
}

/**
 * Die hochgerechneten Tage in der Form, die die Berechnungs-Engine liest.
 * Alles, was die Regeln nicht auswerten, bleibt leer.
 */
export async function ladeHochrechnungAlsTourRows(
	employeeId: string,
	jahr: number
): Promise<TourRow[]> {
	const rows = await db.query.hochrechnungTouren.findMany({
		where: and(eq(hochrechnungTouren.employee, employeeId), eq(hochrechnungTouren.jahr, jahr))
	});

	return rows.map((row) => ({
		id: row.id,
		datum: row.datum,
		employee: row.employee,
		abkuerzung: row.abkuerzung,
		tourNumber: row.tourNumber,
		tourSuffix: null,
		aenderungKommentar: null,
		schichtdauer: null,
		arbeitszeit: null,
		bezahlteZeit: null,
		bezahltePause: null,
		depot: null,
		lastEdited: null,
		startTime: null,
		endTime: null
	}));
}
