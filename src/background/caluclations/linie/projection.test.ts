import { describe, expect, it } from 'vitest';
import { SopreTourType } from '$background/api/types/sopretypes';
import { hochrechnen } from './projection';
import type { Wochenschema } from './types';

const schema: Wochenschema = {
	zyklusLaenge: 2,
	gueltigVon: '2025-12-14',
	gueltigBis: '2026-12-12',
	wochen: [
		['RT', '101', '102', '103', '104', 'RES', 'CT'],
		['CT', '201', '202', '203', '204', 'RES', 'RT']
	]
};

describe('hochrechnen', () => {
	it('erzeugt genau die Tage des Zeitraums, Grenzen eingeschlossen', () => {
		const tage = hochrechnen(schema, 1, '2026-12-13', '2026-12-31');

		expect(tage).toHaveLength(19);
		expect(tage[0].dateKey).toBe('2026-12-13');
		expect(tage[tage.length - 1].dateKey).toBe('2026-12-31');
	});

	it('zaehlt den Tourenablauf ueber das Planende hinaus weiter', () => {
		// 13.12.2026 ist Wochenindex 52. Linie 1 steht dann auf Wochenfolge
		// ((1 - 1 + 52) mod 2) + 1 = 1, also wieder auf der ersten Woche.
		const tage = hochrechnen(schema, 1, '2026-12-13', '2026-12-19');

		expect(tage.map((tag) => tag.eintrag)).toEqual(['RT', '101', '102', '103', '104', 'RES', 'CT']);
		expect(tage[0].wochenfolge).toBe(1);
		expect(tage[0].wochentag).toBe(0);
	});

	it('uebersetzt die Eintraege in Tourfelder', () => {
		const tage = hochrechnen(schema, 1, '2026-12-13', '2026-12-19');

		expect(tage[0]).toMatchObject({ abkuerzung: SopreTourType.RUHETAGE, tourNumber: null });
		expect(tage[1]).toMatchObject({ abkuerzung: null, tourNumber: 101 });
		expect(tage[5]).toMatchObject({ abkuerzung: SopreTourType.RESERVE, tourNumber: null });
		expect(tage[6]).toMatchObject({ abkuerzung: SopreTourType.KOMPENSATIONSTAG, tourNumber: null });
	});

	it('liefert nichts, wenn der Zeitraum leer ist', () => {
		// Sobald die SBB die Dezembertouren publiziert, liegt der erste
		// hochzurechnende Tag hinter dem Jahresende.
		expect(hochrechnen(schema, 1, '2027-01-01', '2026-12-31')).toEqual([]);
	});

	it('verschiebt benachbarte Linien gegeneinander', () => {
		const linie1 = hochrechnen(schema, 1, '2026-12-13', '2026-12-19');
		const linie2 = hochrechnen(schema, 2, '2026-12-13', '2026-12-19');

		expect(linie1[0].eintrag).toBe('RT');
		expect(linie2[0].eintrag).toBe('CT');
	});
});
