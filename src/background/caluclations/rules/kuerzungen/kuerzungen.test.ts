import { describe, expect, it } from 'vitest';
import { SopreTourType } from '$background/api/types/sopretypes';
import type { AccountId, TourRow } from '$background/caluclations/types';
import { kuerzungenRule } from './kuerzungen';
import type { RuleContext } from '$background/caluclations/rules/types';
import { collectKuerzungenChargeTargets } from '$background/caluclations/kuerzungen-helper';

function tour(abkuerzung: TourRow['abkuerzung'], datum: TourRow['datum'] = 0): TourRow {
	return { abkuerzung, datum } as TourRow;
}

function ctxWithTarget(datum: number, target: AccountId): RuleContext {
	return { ferienChargeTargets: new Map(), kuerzungenChargeTargets: new Map([[datum, target]]) };
}

const emptyCtx: RuleContext = {
	ferienChargeTargets: new Map(),
	kuerzungenChargeTargets: new Map()
};

function datumToDate(datum: number): number {
	const datumStr = datum.toString();
	const year = parseInt(datumStr.slice(0, 4), 10);
	const month = parseInt(datumStr.slice(4, 6), 10) - 1;
	const day = parseInt(datumStr.slice(6, 8), 10);
	return new Date(year, month, day).getTime();
}

describe('kuerzungenRule', () => {
	it.each([SopreTourType.KRANK, SopreTourType.NICHTBERUFSUNFALL, SopreTourType.BERUFSUNFALL])(
		'matches ganztägige Abwesenheiten mit abkuerzung %s (Ziffer 29 Abs. 1)',
		(abkuerzung) => {
			expect(kuerzungenRule.matches(tour(abkuerzung), emptyCtx)).toBe(true);
		}
	);

	it('matches unbezahlten Urlaub (Ziffer 29 Abs. 1)', () => {
		expect(kuerzungenRule.matches(tour(SopreTourType.UNBEZAHLTER_URLAUB), emptyCtx)).toBe(true);
	});

	it('ignores the day when no charge target is assigned', () => {
		expect(
			kuerzungenRule.apply(tour(SopreTourType.KRANK, datumToDate(20240101)), emptyCtx)
		).toEqual({
			kind: 'ignore',
			reason: 'Kuürzung-Tag konnte nicht zugeordnet werden'
		});
	});

	it('ignores the day when the charge target is not a Kürzungskonto', () => {
		const datum = datumToDate(20240101);
		const ctx = ctxWithTarget(datum, '5');

		expect(kuerzungenRule.apply(tour(SopreTourType.KRANK, datum), ctx)).toEqual({
			kind: 'ignore',
			reason: 'Unbekanntes Zielkonto für Kürzung'
		});
	});

	it.each<[AccountId, string]>([
		['9040', 'Kuerzung Ferien (9040 -1)'],
		['9046', 'Kuerzung Kompensationstag (9046 -1)'],
		['9047', 'Kuerzung Ruhetag (9047 -1)']
	])('applies -1 to account %s when a charge target is assigned', (target, expectedRule) => {
		const datum = datumToDate(20240101);
		const ctx = ctxWithTarget(datum, target);

		expect(kuerzungenRule.apply(tour(SopreTourType.KRANK, datum), ctx)).toEqual({
			kind: 'apply',
			accountId: target,
			rule: expectedRule,
			delta: -1
		});
	});

	it('looks up the charge target using the tour date, not any assigned date', () => {
		const ctx = ctxWithTarget(datumToDate(20240101), '9047');

		expect(kuerzungenRule.apply(tour(SopreTourType.KRANK, datumToDate(20240102)), ctx)).toEqual({
			kind: 'ignore',
			reason: 'Kuürzung-Tag konnte nicht zugeordnet werden'
		});
	});
});

describe('collectKuerzungenChargeTargets', () => {
	const YEAR = 2025;
	const TAGE_IM_JAHR = 365;
	const AUSGLEICHSTAGE_IM_JAHR = 52;
	const RUHETAGE_FAKTOR = 63;
	const NO_FERIEN = 0;
	const FERIEN_ANSPRUCH = 25;

	function sequentialAbwesenheiten(
		count: number,
		type: SopreTourType = SopreTourType.KRANK,
		year: number = YEAR
	): TourRow[] {
		const start = new Date(year, 0, 1);
		return Array.from({ length: count }, (_, i) => {
			const datum = new Date(start);
			datum.setDate(datum.getDate() + i);
			return { abkuerzung: type, datum: datum.getTime() } as TourRow;
		});
	}

	function countByTarget(targets: Map<number, AccountId>, target: AccountId): number {
		return [...targets.values()].filter((value) => value === target).length;
	}

	describe('Ruhetage-Kürzung (Ziffer 29 Abs. 1 & 3)', () => {
		it.each([
			[100, Math.floor((RUHETAGE_FAKTOR * 100) / TAGE_IM_JAHR)],
			[179, Math.floor((RUHETAGE_FAKTOR * 179) / TAGE_IM_JAHR)],
			[TAGE_IM_JAHR, RUHETAGE_FAKTOR]
		])(
			'kürzt bei %i Abwesenheitstagen die Ruhetage um floor(63 * Dauer / 365) = %i Tage',
			(anzahlAbwesenheiten, erwarteteKuerzung) => {
				const targets = collectKuerzungenChargeTargets(
					sequentialAbwesenheiten(anzahlAbwesenheiten),
					YEAR,
					NO_FERIEN
				);

				expect(countByTarget(targets, '9047')).toBe(erwarteteKuerzung);
			}
		);

		it('lässt Bruchteile von Tagen fallen, statt kaufmännisch zu runden', () => {
			// floor(63 * 6 / 365) = floor(1.0356) = 1, nicht aufgerundet
			const targets = collectKuerzungenChargeTargets(sequentialAbwesenheiten(6), YEAR, NO_FERIEN);

			expect(countByTarget(targets, '9047')).toBe(1);
		});
	});

	describe('Ausgleichstage-Kürzung (Ziffer 29 Abs. 3)', () => {
		it.each([
			[100, Math.round((AUSGLEICHSTAGE_IM_JAHR * 100) / TAGE_IM_JAHR)],
			[TAGE_IM_JAHR, AUSGLEICHSTAGE_IM_JAHR]
		])(
			'kürzt bei %i Abwesenheitstagen die Ausgleichstage um kaufmännisch gerundet(52 * Dauer / 365) = %i Tage',
			(anzahlAbwesenheiten, erwarteteKuerzung) => {
				const targets = collectKuerzungenChargeTargets(
					sequentialAbwesenheiten(anzahlAbwesenheiten),
					YEAR,
					NO_FERIEN
				);

				expect(countByTarget(targets, '9046')).toBe(erwarteteKuerzung);
			}
		);

		it('rundet kaufmännisch ab, wenn der Bruchteil unter 0.5 liegt', () => {
			// 52 * 50 / 365 = 7.123 -> 7
			const targets = collectKuerzungenChargeTargets(sequentialAbwesenheiten(50), YEAR, NO_FERIEN);

			expect(countByTarget(targets, '9046')).toBe(7);
		});

		it('rundet kaufmännisch auf, wenn der Bruchteil 0.5 oder mehr beträgt', () => {
			// 52 * 179 / 365 = 25.501 -> 26
			const targets = collectKuerzungenChargeTargets(sequentialAbwesenheiten(179), YEAR, NO_FERIEN);

			expect(countByTarget(targets, '9046')).toBe(26);
		});

		it('kürzt Ruhetage und Ausgleichstage unabhängig voneinander, ohne sich gegenseitig zu überschreiben', () => {
			// 80 Tage bleiben unter der 90-Tage-Schwelle der Ferienkürzung, damit dieser Test
			// ausschliesslich Ruhetage/Ausgleichstage prüft.
			const targets = collectKuerzungenChargeTargets(sequentialAbwesenheiten(80), YEAR, NO_FERIEN);

			expect(countByTarget(targets, '9047')).toBe(Math.floor((63 * 80) / 365));
			expect(countByTarget(targets, '9046')).toBe(Math.round((52 * 80) / 365));
		});
	});

	describe('5-Tage-Freigrenze bei Krankheit/Unfall (Ziffer 29 Abs. 2)', () => {
		it('führt bei maximal 5 ganzen Abwesenheitstagen pro Kalenderjahr zu keiner Kürzung', () => {
			const targets = collectKuerzungenChargeTargets(sequentialAbwesenheiten(5), YEAR, NO_FERIEN);

			expect(targets.size).toBe(0);
		});

		it('kürzt ab dem ersten Abwesenheitstag, sobald insgesamt mehr als 5 Tage anfallen', () => {
			const targets = collectKuerzungenChargeTargets(sequentialAbwesenheiten(6), YEAR, NO_FERIEN);

			expect(countByTarget(targets, '9047')).toBe(1);
			expect(countByTarget(targets, '9046')).toBe(1);
		});
	});

	describe('Ferien-Kürzung (Anhang 4, letzter Abschnitt)', () => {
		it('lässt bei Krankheit, Unfall oder obligatorischem Dienst die ersten 90 Abwesenheitstage bei der Ferienkürzung ausser Betracht', () => {
			// 200 Krankheitstage: nur die 110 Tage über der 90-Tage-Schwelle zählen für die Formel.
			// floor(25 * (200 - 90) / 365) = floor(7.534) = 7
			const targets = collectKuerzungenChargeTargets(
				sequentialAbwesenheiten(200),
				YEAR,
				FERIEN_ANSPRUCH
			);

			expect(countByTarget(targets, '9040')).toBe(7);
		});

		it('kürzt die Ferien bei unbezahltem Urlaub nicht, wenn dieser genau 30 Tage dauert', () => {
			// "mehr als 30 Tage" -> bei genau 30 Tagen greift die Kürzung noch nicht
			const targets = collectKuerzungenChargeTargets(
				sequentialAbwesenheiten(30, SopreTourType.UNBEZAHLTER_URLAUB),
				YEAR,
				FERIEN_ANSPRUCH
			);

			expect(countByTarget(targets, '9040')).toBe(0);
		});

		it('kürzt die Ferien bei unbezahltem Urlaub, sobald dieser insgesamt mehr als 30 Tage dauert', () => {
			// anrechenbar: 45 - 30 = 15 -> floor(25 * 15 / 365) = floor(1.027) = 1
			const targets = collectKuerzungenChargeTargets(
				sequentialAbwesenheiten(45, SopreTourType.UNBEZAHLTER_URLAUB),
				YEAR,
				FERIEN_ANSPRUCH
			);

			expect(countByTarget(targets, '9040')).toBe(1);
		});

		it('kumuliert Krankheit/Unfall/Dienst- und Urlaubsabwesenheiten für die Ferienkürzung nur, wenn beide Schwellen (90 bzw. 30 Tage) für sich bereits erreicht sind', () => {
			// 40 Tage unbezahlter Urlaub (anrechenbar: 40 - 30 = 10) UND 100 Krankheitstage
			// (anrechenbar: 100 - 90 = 10) überschreiten beide für sich ihre Schwelle.
			// Kumuliert: floor(25 * (10 + 10) / 365) = floor(1.3699) = 1
			const targets = collectKuerzungenChargeTargets(
				[
					...sequentialAbwesenheiten(40, SopreTourType.UNBEZAHLTER_URLAUB),
					...sequentialAbwesenheiten(100, SopreTourType.KRANK)
				],
				YEAR,
				FERIEN_ANSPRUCH
			);

			expect(countByTarget(targets, '9040')).toBe(1);
		});

		it('kürzt die Ferien um floor(Anzahl Ferientage * Dauer der Abwesenheit in Kalendertagen / (365 oder 366)), abgerundet auf ganze Tage', () => {
			// floor(25 * (40 - 30) / 365) = floor(0.685) = 0, noch keine Kürzung
			const knapp = collectKuerzungenChargeTargets(
				sequentialAbwesenheiten(40, SopreTourType.UNBEZAHLTER_URLAUB),
				YEAR,
				FERIEN_ANSPRUCH
			);
			expect(countByTarget(knapp, '9040')).toBe(0);

			// floor(25 * (70 - 30) / 365) = floor(2.739) = 2, nicht kaufmännisch auf 3 gerundet
			const deutlich = collectKuerzungenChargeTargets(
				sequentialAbwesenheiten(70, SopreTourType.UNBEZAHLTER_URLAUB),
				YEAR,
				FERIEN_ANSPRUCH
			);
			expect(countByTarget(deutlich, '9040')).toBe(2);
		});
	});
});
