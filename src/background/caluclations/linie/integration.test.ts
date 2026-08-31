import { describe, expect, it } from 'vitest';
import { addDaysToDateKey } from '$background/caluclations/date-helper';
import oltenPlan2026 from '$background/data/jahrestourenplaene/olten-2026.json';
import { erkenneLinie, type ErkennungsTag } from './detection';
import { hochrechnen } from './projection';
import { planTagFor } from './rotation';
import { validiereJahrestourenplan } from './plan-datei';
import { toPlanEintrag, type Wochenschema } from './types';

/**
 * Durchspielt die ganze Kette auf den echten Plandaten aus Olten 2026: aus
 * einem Jahr Touren die Linie erkennen und die Resttage hochrechnen.
 */

const plan = validiereJahrestourenplan(oltenPlan2026);

function schemaFuer(gruppe: string): Wochenschema {
	const eintrag = plan.gruppen.find((kandidat) => kandidat.gruppe === gruppe)!;

	return {
		zyklusLaenge: eintrag.zyklusLaenge,
		gueltigVon: plan.gueltigVon,
		gueltigBis: plan.gueltigBis,
		wochen: eintrag.wochen
	};
}

/** Die Tage, die die SBB fuer eine Linie publiziert haette. */
function publizierteTage(schema: Wochenschema, linie: number, von: string, bis: string) {
	const tage: ErkennungsTag[] = [];

	for (let dateKey = von; dateKey <= bis; dateKey = addDaysToDateKey(dateKey, 1)) {
		const { abkuerzung, tourNumber } = toPlanEintrag(planTagFor(schema, linie, dateKey).eintrag);
		tage.push({ dateKey, abkuerzung, tourNumber });
	}

	return tage;
}

// Die SBB publiziert bis zum letzten Plantag; danach beginnt die Hochrechnung.
const LETZTER_PUBLIZIERTER_TAG = '2026-12-12';
const JAHRESENDE = '2026-12-31';

describe.each([
	['Gruppe 1', 48],
	['Gruppe 2', 64],
	['Gruppe 31 RES', 48]
])('%s', (gruppe, zyklusLaenge) => {
	const schema = schemaFuer(gruppe);

	it.each([1, 7, Math.floor(zyklusLaenge / 2), zyklusLaenge])(
		'erkennt Linie %i aus dem Tourenablauf des Jahres',
		(linie) => {
			const tage = publizierteTage(schema, linie, '2026-01-01', LETZTER_PUBLIZIERTER_TAG);

			expect(erkenneLinie(schema, tage)).toEqual({
				kind: 'erkannt',
				linie,
				trefferquote: 1,
				bewertbareTage: tage.length
			});
		}
	);

	it('rechnet die 19 Tage bis Jahresende hoch', () => {
		const tage = hochrechnen(schema, 1, addDaysToDateKey(LETZTER_PUBLIZIERTER_TAG, 1), JAHRESENDE);

		expect(tage).toHaveLength(19);
		expect(tage[0].dateKey).toBe('2026-12-13');
		expect(tage.at(-1)!.dateKey).toBe(JAHRESENDE);
		// Der Zyklus laeuft ununterbrochen weiter: die Wochenfolge des ersten
		// hochgerechneten Sonntags folgt direkt auf die des letzten Plantags.
		expect(tage[0].wochenfolge).toBe(
			(planTagFor(schema, 1, LETZTER_PUBLIZIERTER_TAG).wochenfolge % zyklusLaenge) + 1
		);
	});

	it('rechnet fuer jede Linie ausschliesslich bekannte Tagesarten hoch', () => {
		for (let linie = 1; linie <= zyklusLaenge; linie += 1) {
			const tage = hochrechnen(schema, linie, '2026-12-13', JAHRESENDE);

			for (const tag of tage) {
				expect(tag.eintrag).toMatch(/^(RT|CT|RES|\d+)$/);
				expect(tag.abkuerzung !== null || tag.tourNumber !== null).toBe(true);
			}
		}
	});
});

describe('Ruhetage und Kompensationstage der Hochrechnung', () => {
	it('liefert fuer jede Linie der Gruppe 2 eine plausible Anzahl freier Tage', () => {
		const schema = schemaFuer('Gruppe 2');

		for (let linie = 1; linie <= schema.zyklusLaenge; linie += 1) {
			const tage = hochrechnen(schema, linie, '2026-12-13', JAHRESENDE);
			const frei = tage.filter((tag) => tag.eintrag === 'RT' || tag.eintrag === 'CT').length;

			// Ueber knapp drei Wochen sind ein paar freie Tage garantiert, aber
			// niemals alle.
			expect(frei).toBeGreaterThan(0);
			expect(frei).toBeLessThan(tage.length);
		}
	});
});
