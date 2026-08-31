import { describe, expect, it } from 'vitest';
import { planTagFor, weekIndexForDateKey, wochenfolgeFor } from './rotation';
import type { Wochenschema } from './types';

// Der Jahrestourenplan Olten 2026 laeuft von Sonntag, 14.12.2025 bis
// Samstag, 12.12.2026 -- 52 Wochen.
const PLAN_START = '2025-12-14';

describe('weekIndexForDateKey', () => {
	it('zaehlt die erste Planwoche als 0', () => {
		expect(weekIndexForDateKey(PLAN_START, '2025-12-14')).toBe(0);
		expect(weekIndexForDateKey(PLAN_START, '2025-12-20')).toBe(0);
	});

	it('wechselt am Sonntag in die naechste Woche', () => {
		expect(weekIndexForDateKey(PLAN_START, '2025-12-21')).toBe(1);
	});

	it('endet mit Woche 51 am letzten Plantag', () => {
		expect(weekIndexForDateKey(PLAN_START, '2026-12-12')).toBe(51);
	});

	it('zaehlt fuer die Hochrechnung ueber das Planende hinaus weiter', () => {
		expect(weekIndexForDateKey(PLAN_START, '2026-12-13')).toBe(52);
		expect(weekIndexForDateKey(PLAN_START, '2026-12-31')).toBe(54);
	});

	it('bleibt ueber die Sommerzeitumstellung hinweg korrekt', () => {
		// 29.03.2026 und 25.10.2026 sind die Umstellungstage in der Schweiz.
		expect(weekIndexForDateKey(PLAN_START, '2026-03-28')).toBe(14);
		expect(weekIndexForDateKey(PLAN_START, '2026-03-29')).toBe(15);
		expect(weekIndexForDateKey(PLAN_START, '2026-10-24')).toBe(44);
		expect(weekIndexForDateKey(PLAN_START, '2026-10-25')).toBe(45);
	});
});

describe('wochenfolgeFor', () => {
	it('startet die Linie auf der gleichnamigen Wochenfolge', () => {
		expect(wochenfolgeFor(1, 0, 64)).toBe(1);
		expect(wochenfolgeFor(37, 0, 64)).toBe(37);
	});

	it('rueckt pro Woche um eine Wochenfolge weiter', () => {
		expect(wochenfolgeFor(1, 1, 64)).toBe(2);
		expect(wochenfolgeFor(1, 5, 64)).toBe(6);
	});

	// Gegen die letzten Zeilen der PDF-Tabellen geprueft.
	it('bricht bei Zykluslaenge 64 von 64 auf 1 um', () => {
		expect(wochenfolgeFor(64, 0, 64)).toBe(64);
		expect(wochenfolgeFor(64, 1, 64)).toBe(1);
		expect(wochenfolgeFor(64, 2, 64)).toBe(2);
		expect(wochenfolgeFor(63, 1, 64)).toBe(64);
		expect(wochenfolgeFor(63, 2, 64)).toBe(1);
	});

	it('bricht bei Zykluslaenge 48 von 48 auf 1 um', () => {
		expect(wochenfolgeFor(47, 1, 48)).toBe(48);
		expect(wochenfolgeFor(47, 2, 48)).toBe(1);
		expect(wochenfolgeFor(48, 1, 48)).toBe(1);
		expect(wochenfolgeFor(48, 2, 48)).toBe(2);
	});

	it('laeuft mit negativem Wochenindex sauber rueckwaerts', () => {
		expect(wochenfolgeFor(1, -1, 48)).toBe(48);
		expect(wochenfolgeFor(1, -49, 48)).toBe(48);
	});
});

describe('planTagFor', () => {
	const schema: Wochenschema = {
		zyklusLaenge: 2,
		gueltigVon: PLAN_START,
		gueltigBis: '2026-12-12',
		wochen: [
			['RT', '101', '102', '103', '104', '105', 'CT'],
			['CT', '201', '202', '203', '204', '205', 'RT']
		]
	};

	it('liest den Eintrag ueber Wochenfolge und Wochentag', () => {
		// 14.12.2025 ist ein Sonntag: Wochenindex 0, Wochentag 0.
		expect(planTagFor(schema, 1, '2025-12-14')).toEqual({
			wochenfolge: 1,
			wochentag: 0,
			eintrag: 'RT'
		});
		expect(planTagFor(schema, 1, '2025-12-17')).toEqual({
			wochenfolge: 1,
			wochentag: 3,
			eintrag: '103'
		});
	});

	it('wechselt in der Folgewoche auf die naechste Wochenfolge', () => {
		expect(planTagFor(schema, 1, '2025-12-21').wochenfolge).toBe(2);
		expect(planTagFor(schema, 1, '2025-12-21').eintrag).toBe('CT');
	});

	it('verschiebt zwei Linien gegeneinander um genau eine Woche', () => {
		expect(planTagFor(schema, 2, '2025-12-14').eintrag).toBe('CT');
		expect(planTagFor(schema, 2, '2025-12-21').eintrag).toBe('RT');
	});
});
