import { describe, expect, it } from 'vitest';
import { SopreTourType } from '$background/api/types/sopretypes';
import type { FerienChargeAccount, TourRow } from '$background/caluclations/types';
import { ferienRule } from './ferien';
import type { RuleContext } from '$background/caluclations/rules/types';
import { collectFerienChargeTargets } from '../../holiday-schedule';

function tour(abkuerzung: TourRow['abkuerzung'], datum: TourRow['datum'] = 0): TourRow {
	return { abkuerzung, datum } as TourRow;
}

function ctxWithTarget(datum: number, target: FerienChargeAccount): RuleContext {
	return { ferienChargeTargets: new Map([[datum, target]]) };
}

const emptyCtx: RuleContext = { ferienChargeTargets: new Map() };

describe('ferienRule', () => {
	it('matches tours with abkuerzung Ferien', () => {
		expect(ferienRule.matches(tour(SopreTourType.FERIEN), emptyCtx)).toBe(true);
	});

	it('does not match unrelated tours', () => {
		expect(ferienRule.matches(tour(SopreTourType.RUHETAGE), emptyCtx)).toBe(false);
	});

	it('ignores the day when no charge target is assigned', () => {
		expect(ferienRule.apply(tour(SopreTourType.FERIEN, datumToDate(20240101)), emptyCtx)).toEqual({
			kind: 'ignore',
			reason: 'Ferien-Tag konnte nicht zugeordnet werden'
		});
	});

	it.each<[FerienChargeAccount, string]>([
		['9040', 'Ferienregel -> 9040 (-1 Arbeitstag)'],
		['9046', 'Ferienregel -> 9046 (-1 Ausgleichstag)'],
		['9047', 'Ferienregel -> 9047 (-1 Ruhetag)']
	])('applies -1 to account %s when a charge target is assigned', (target, expectedRule) => {
		const datum = datumToDate(20240101);
		const ctx = ctxWithTarget(datum, target);

		expect(ferienRule.apply(tour(SopreTourType.FERIEN, datum), ctx)).toEqual({
			kind: 'apply',
			accountId: target,
			rule: expectedRule,
			delta: -1
		});
	});

	it('looks up the charge target using the tour date, not any assigned date', () => {
		const ctx = ctxWithTarget(datumToDate(20240101), '9040');

		expect(ferienRule.apply(tour(SopreTourType.FERIEN, datumToDate(20240102)), ctx)).toEqual({
			kind: 'ignore',
			reason: 'Ferien-Tag konnte nicht zugeordnet werden'
		});
	});

	it('correctly groups the ferien charge targets by date', () => {
		const ctx: RuleContext = {
			ferienChargeTargets: new Map([
				[datumToDate(20240101), '9040'],
				[datumToDate(20240102), '9046'],
				[datumToDate(20240103), '9047']
			])
		};

		expect(ferienRule.apply(tour(SopreTourType.FERIEN, datumToDate(20240101)), ctx)).toEqual({
			kind: 'apply',
			accountId: '9040',
			rule: 'Ferienregel -> 9040 (-1 Arbeitstag)',
			delta: -1
		});

		expect(ferienRule.apply(tour(SopreTourType.FERIEN, datumToDate(20240102)), ctx)).toEqual({
			kind: 'apply',
			accountId: '9046',
			rule: 'Ferienregel -> 9046 (-1 Ausgleichstag)',
			delta: -1
		});

		expect(ferienRule.apply(tour(SopreTourType.FERIEN, datumToDate(20240103)), ctx)).toEqual({
			kind: 'apply',
			accountId: '9047',
			rule: 'Ferienregel -> 9047 (-1 Ruhetag)',
			delta: -1
		});
	});

	it('correctly creates chunks of 2 week for ferien charge targets', () => {
		const ctx: RuleContext = {
			ferienChargeTargets: collectFerienChargeTargets([
				createEmptyTour(SopreTourType.FERIEN, 20240101),
				createEmptyTour(SopreTourType.FERIEN, 20240102),
				createEmptyTour(SopreTourType.FERIEN, 20240103),
				createEmptyTour(SopreTourType.FERIEN, 20240104),
				createEmptyTour(SopreTourType.FERIEN, 20240105),
				createEmptyTour(SopreTourType.FERIEN, 20240106),
				createEmptyTour(SopreTourType.FERIEN, 20240107),
				createEmptyTour(SopreTourType.FERIEN, 20240108),
				createEmptyTour(SopreTourType.FERIEN, 20240109),
				createEmptyTour(SopreTourType.FERIEN, 20240110),
				createEmptyTour(SopreTourType.FERIEN, 20240111),
				createEmptyTour(SopreTourType.FERIEN, 20240112),
				createEmptyTour(SopreTourType.FERIEN, 20240113),
				createEmptyTour(SopreTourType.FERIEN, 20240114),
				createEmptyTour(SopreTourType.FERIEN, 20240115)
			])
		};

		expect(ferienRule.apply(tour(SopreTourType.FERIEN, datumToDate(20240101)), ctx)).toEqual({
			kind: 'apply',
			accountId: '9046',
			rule: 'Ferienregel -> 9046 (-1 Ausgleichstag)',
			delta: -1
		});
		expect(ferienRule.apply(tour(SopreTourType.FERIEN, datumToDate(20240102)), ctx)).toEqual({
			kind: 'apply',
			accountId: '9047',
			rule: 'Ferienregel -> 9047 (-1 Ruhetag)',
			delta: -1
		});
		expect(ferienRule.apply(tour(SopreTourType.FERIEN, datumToDate(20240108)), ctx)).toEqual({
			kind: 'apply',
			accountId: '9046',
			rule: 'Ferienregel -> 9046 (-1 Ausgleichstag)',
			delta: -1
		});
		expect(ferienRule.apply(tour(SopreTourType.FERIEN, datumToDate(20240109)), ctx)).toEqual({
			kind: 'apply',
			accountId: '9047',
			rule: 'Ferienregel -> 9047 (-1 Ruhetag)',
			delta: -1
		});
		expect(ferienRule.apply(tour(SopreTourType.FERIEN, datumToDate(20240115)), ctx)).toEqual({
			kind: 'apply',
			accountId: '9046',
			rule: 'Ferienregel -> 9046 (-1 Ausgleichstag)',
			delta: -1
		});
	});
	it('correctly creates chunks of 1 week for ferien charge targets', () => {
		const ctx: RuleContext = {
			ferienChargeTargets: collectFerienChargeTargets([
				createEmptyTour(SopreTourType.FERIEN, 20240101),
				createEmptyTour(SopreTourType.FERIEN, 20240102),
				createEmptyTour(SopreTourType.FERIEN, 20240103),
				createEmptyTour(SopreTourType.FERIEN, 20240104),
				createEmptyTour(SopreTourType.FERIEN, 20240105),
				createEmptyTour(SopreTourType.FERIEN, 20240106),
				createEmptyTour(SopreTourType.FERIEN, 20240107),
				createEmptyTour(SopreTourType.FERIEN, 20240108)
			])
		};

		expect(ferienRule.apply(tour(SopreTourType.FERIEN, datumToDate(20240101)), ctx)).toEqual({
			kind: 'apply',
			accountId: '9046',
			rule: 'Ferienregel -> 9046 (-1 Ausgleichstag)',
			delta: -1
		});
		expect(ferienRule.apply(tour(SopreTourType.FERIEN, datumToDate(20240102)), ctx)).toEqual({
			kind: 'apply',
			accountId: '9047',
			rule: 'Ferienregel -> 9047 (-1 Ruhetag)',
			delta: -1
		});
		expect(ferienRule.apply(tour(SopreTourType.FERIEN, datumToDate(20240108)), ctx)).toEqual({
			kind: 'apply',
			accountId: '9046',
			rule: 'Ferienregel -> 9046 (-1 Ausgleichstag)',
			delta: -1
		});
	});

	it('correctly lets single days stay the same for ferien charge targets', () => {
		const ctx: RuleContext = {
			ferienChargeTargets: collectFerienChargeTargets([
				createEmptyTour(SopreTourType.FERIEN, 20240101),
				createEmptyTour(SopreTourType.FERIEN, 20240102),
				createEmptyTour(SopreTourType.FERIEN, 20240103),
				createEmptyTour(SopreTourType.FERIEN, 20240104),

				createEmptyTour(SopreTourType.FERIEN, 20240107),
				createEmptyTour(SopreTourType.FERIEN, 20240108),
				createEmptyTour(SopreTourType.FERIEN, 20240109)
			])
		};

		for (const datum of [20240101, 20240102, 20240103, 20240104, 20240107, 20240108, 20240109]) {
			expect(ferienRule.apply(tour(SopreTourType.FERIEN, datumToDate(datum)), ctx)).toEqual({
				kind: 'apply',
				accountId: '9040',
				rule: 'Ferienregel -> 9040 (-1 Arbeitstag)',
				delta: -1
			});
		}
	});
});

function datumToDate(datum: number): number {
	const datumStr = datum.toString();
	const year = parseInt(datumStr.slice(0, 4), 10);
	const month = parseInt(datumStr.slice(4, 6), 10) - 1;
	const day = parseInt(datumStr.slice(6, 8), 10);
	return new Date(year, month, day).getTime();
}

function createEmptyTour(abkuerzung: SopreTourType, datum: number): TourRow {
	return { abkuerzung, datum: datumToDate(datum) } as TourRow;
}
