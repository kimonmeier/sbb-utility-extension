import { describe, expect, it } from 'vitest';
import { SopreTourType } from '$background/api/types/sopretypes';
import { addDaysToDateKey } from '$background/caluclations/date-helper';
import { erkenneLinie, istBewertbar, passtZuEintrag, type ErkennungsTag } from './detection';
import { planTagFor } from './rotation';
import { toPlanEintrag, type Wochenschema } from './types';

const PLAN_START = '2025-12-14';

/** Acht klar unterscheidbare Wochen, damit sich die Linien nicht aehneln. */
function schemaMitAchtWochen(): Wochenschema {
	const wochen = Array.from({ length: 8 }, (_, index) => {
		const basis = 100 + index * 10;
		return [
			'RT',
			String(basis + 1),
			String(basis + 2),
			String(basis + 3),
			String(basis + 4),
			'RES',
			'CT'
		];
	});

	return { zyklusLaenge: 8, gueltigVon: PLAN_START, gueltigBis: '2026-12-12', wochen };
}

/** Erzeugt die Tage, die eine Linie planmaessig haette. */
function tageFuerLinie(schema: Wochenschema, linie: number, anzahl: number): ErkennungsTag[] {
	const tage: ErkennungsTag[] = [];
	let dateKey = PLAN_START;

	for (let index = 0; index < anzahl; index += 1) {
		const eintrag = toPlanEintrag(planTagFor(schema, linie, dateKey).eintrag);
		tage.push({ dateKey, abkuerzung: eintrag.abkuerzung, tourNumber: eintrag.tourNumber });
		dateKey = addDaysToDateKey(dateKey, 1);
	}

	return tage;
}

describe('istBewertbar', () => {
	it('schliesst Abwesenheiten aus, die den Plan ueberschreiben', () => {
		for (const abkuerzung of [
			SopreTourType.FERIEN,
			SopreTourType.KRANK,
			SopreTourType.NICHTBERUFSUNFALL,
			SopreTourType.BERUFSUNFALL,
			SopreTourType.UNBEZAHLTER_URLAUB
		]) {
			expect(istBewertbar({ dateKey: '2026-01-05', abkuerzung, tourNumber: null })).toBe(false);
		}
	});

	it('schliesst getauschte und verlangte Tage aus', () => {
		for (const abkuerzung of [
			SopreTourType.RUHETAG_VERLANGT,
			SopreTourType.RUHETAG_TAUSCH,
			SopreTourType.KOMPENSATIONSTAG_VERLANGT,
			SopreTourType.KOMPENSATIONSTAG_TAUSCH
		]) {
			expect(istBewertbar({ dateKey: '2026-01-05', abkuerzung, tourNumber: null })).toBe(false);
		}
	});

	it('bewertet planmaessige Tage', () => {
		expect(
			istBewertbar({ dateKey: '2026-01-05', abkuerzung: SopreTourType.RUHETAGE, tourNumber: null })
		).toBe(true);
		expect(istBewertbar({ dateKey: '2026-01-05', abkuerzung: null, tourNumber: 233 })).toBe(true);
	});
});

describe('passtZuEintrag', () => {
	it('vergleicht RT und CT strikt', () => {
		expect(
			passtZuEintrag({ dateKey: 'x', abkuerzung: SopreTourType.RUHETAGE, tourNumber: null }, 'RT')
		).toBe(true);
		expect(
			passtZuEintrag(
				{ dateKey: 'x', abkuerzung: SopreTourType.KOMPENSATIONSTAG, tourNumber: null },
				'RT'
			)
		).toBe(false);
	});

	it('akzeptiert jede Reserve-Schichtlage', () => {
		for (const abkuerzung of [
			SopreTourType.RESERVE,
			SopreTourType.RESERVE_FRÜH,
			SopreTourType.RESERVE_SPÄT
		]) {
			expect(passtZuEintrag({ dateKey: 'x', abkuerzung, tourNumber: null }, 'RES')).toBe(true);
		}
	});

	it('vergleicht Tournummern', () => {
		expect(passtZuEintrag({ dateKey: 'x', abkuerzung: null, tourNumber: 233 }, '233')).toBe(true);
		expect(passtZuEintrag({ dateKey: 'x', abkuerzung: null, tourNumber: 234 }, '233')).toBe(false);
	});
});

describe('erkenneLinie', () => {
	const schema = schemaMitAchtWochen();

	it('findet die Linie bei vollstaendiger Uebereinstimmung', () => {
		const ergebnis = erkenneLinie(schema, tageFuerLinie(schema, 5, 12 * 7));

		expect(ergebnis).toMatchObject({ kind: 'erkannt', linie: 5, trefferquote: 1 });
	});

	it('ignoriert Abwesenheitstage statt sie als Fehltreffer zu werten', () => {
		const tage = tageFuerLinie(schema, 3, 12 * 7).map((tag, index) =>
			index % 5 === 0 ? { ...tag, abkuerzung: SopreTourType.FERIEN, tourNumber: null } : tag
		);

		expect(erkenneLinie(schema, tage)).toMatchObject({ kind: 'erkannt', linie: 3 });
	});

	it('meldet zu wenig Daten statt zu raten', () => {
		expect(erkenneLinie(schema, tageFuerLinie(schema, 2, 20))).toMatchObject({
			kind: 'unklar',
			grund: 'zu-wenig-daten'
		});
	});

	it('meldet fehlende Uebereinstimmung, wenn nichts passt', () => {
		const tage = tageFuerLinie(schema, 1, 12 * 7).map((tag) => ({
			...tag,
			abkuerzung: null,
			tourNumber: 999
		}));

		expect(erkenneLinie(schema, tage)).toMatchObject({
			kind: 'unklar',
			grund: 'keine-uebereinstimmung'
		});
	});

	it('meldet Mehrdeutigkeit, wenn zwei Linien gleich gut passen', () => {
		// Ein Schema, in dem sich alle Wochen gleichen, macht jede Linie
		// gleich plausibel.
		const einfoermig: Wochenschema = {
			zyklusLaenge: 4,
			gueltigVon: PLAN_START,
			gueltigBis: '2026-12-12',
			wochen: Array.from({ length: 4 }, () => ['RT', '101', '102', '103', '104', 'RES', 'CT'])
		};

		expect(erkenneLinie(einfoermig, tageFuerLinie(einfoermig, 2, 12 * 7))).toMatchObject({
			kind: 'unklar',
			grund: 'mehrdeutig'
		});
	});

	it('bewertet nur Tage innerhalb der Plangueltigkeit', () => {
		const kurzerPlan: Wochenschema = { ...schema, gueltigBis: '2026-01-03' };

		expect(erkenneLinie(kurzerPlan, tageFuerLinie(schema, 5, 12 * 7))).toMatchObject({
			kind: 'unklar',
			grund: 'zu-wenig-daten'
		});
	});
});
