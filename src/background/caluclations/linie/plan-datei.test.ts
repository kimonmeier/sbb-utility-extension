import { describe, expect, it } from 'vitest';
import { validiereJahrestourenplan, type JahrestourenplanDatei } from './plan-datei';
import oltenPlan2026 from '$background/data/jahrestourenplaene/olten-2026.json';

function gueltigePlandatei(): JahrestourenplanDatei {
	return {
		version: 1,
		depot: 'OL',
		jahr: 2026,
		gueltigVon: '2025-12-14',
		gueltigBis: '2026-12-12',
		gruppen: [
			{
				gruppe: 'Gruppe 1',
				wochenschema: 'SCP_OL-OL 001',
				zyklusLaenge: 2,
				wochen: [
					['RT', '101', '102', '103', '104', 'RES', 'CT'],
					['CT', '201', '202', '203', '204', 'RES', 'RT']
				]
			}
		]
	};
}

describe('validiereJahrestourenplan', () => {
	it('nimmt eine wohlgeformte Datei an', () => {
		expect(() => validiereJahrestourenplan(gueltigePlandatei())).not.toThrow();
	});

	it('lehnt eine fremde Version ab', () => {
		expect(() => validiereJahrestourenplan({ ...gueltigePlandatei(), version: 2 })).toThrow(
			/Version/
		);
	});

	it('lehnt eine Gruppe ab, deren Wochenzahl nicht zur Zykluslaenge passt', () => {
		const datei = gueltigePlandatei();
		datei.gruppen[0].zyklusLaenge = 3;

		expect(() => validiereJahrestourenplan(datei)).toThrow(/erwartet 3/);
	});

	it('lehnt eine Woche mit falscher Tageszahl ab', () => {
		const datei = gueltigePlandatei();
		datei.gruppen[0].wochen[0] = ['RT', '101'];

		expect(() => validiereJahrestourenplan(datei)).toThrow(/7 Eintraege/);
	});

	it('lehnt einen unbekannten Eintrag ab', () => {
		const datei = gueltigePlandatei();
		datei.gruppen[0].wochen[0][3] = 'XX';

		expect(() => validiereJahrestourenplan(datei)).toThrow(/ungueltiger Eintrag/);
	});
});

describe('mitgelieferter Plan Olten 2026', () => {
	const plan = validiereJahrestourenplan(oltenPlan2026);

	it('ist gueltig und deckt die drei Olten-Gruppen ab', () => {
		expect(plan.gruppen.map((gruppe) => gruppe.gruppe)).toEqual([
			'Gruppe 1',
			'Gruppe 2',
			'Gruppe 31 RES'
		]);
	});

	it('laeuft vom Sonntag 14.12.2025 bis zum Samstag 12.12.2026', () => {
		expect(plan.gueltigVon).toBe('2025-12-14');
		expect(plan.gueltigBis).toBe('2026-12-12');
		expect(new Date(`${plan.gueltigVon}T00:00:00Z`).getUTCDay()).toBe(0);
		expect(new Date(`${plan.gueltigBis}T00:00:00Z`).getUTCDay()).toBe(6);
	});

	// Jede Seite des PDFs nennt in der Kopfzeile "Touren" und "Freie Tage".
	// Stimmen beide Summen, ist das Raster vollstaendig richtig eingelesen.
	it.each([
		['Gruppe 1', 48, 226, 110],
		['Gruppe 2', 64, 303, 145],
		['Gruppe 31 RES', 48, 226, 110]
	])('stimmt fuer %s mit der Kopfzeile des PDFs ueberein', (name, zyklus, touren, frei) => {
		const gruppe = plan.gruppen.find((eintrag) => eintrag.gruppe === name)!;
		const eintraege = gruppe.wochen.flat();

		expect(gruppe.zyklusLaenge).toBe(zyklus);
		expect(eintraege).toHaveLength(zyklus * 7);
		expect(eintraege.filter((eintrag) => eintrag === 'RES' || /^\d+$/.test(eintrag))).toHaveLength(
			touren
		);
		expect(eintraege.filter((eintrag) => eintrag === 'RT' || eintrag === 'CT')).toHaveLength(frei);
	});
});
