import { describe, expect, it } from 'vitest';
import { SopreTourType } from '$background/api/types/sopretypes';
import type { TourRow } from '$background/caluclations/types';
import { kompensationstagRule, ruhetagRule } from './ruhetage';
import type { RuleContext } from '$background/caluclations/rules/types';

function tour(abkuerzung: TourRow['abkuerzung']): TourRow {
	return { abkuerzung } as TourRow;
}

const ctx: RuleContext = {
	ferienChargeTargets: new Map(),
	kuerzungenChargeTargets: new Map(),
	anzahlFerienAnspruchInTagen: 0,
	year: 2024
};

describe('ruhetagRule', () => {
	it.each([
		SopreTourType.RUHETAGE,
		SopreTourType.RUHETAG_VERLANGT,
		SopreTourType.RUHETAG_TAUSCH,
		SopreTourType.GUTHABEN_RUHETAG_PERSONAL
	])('matches tours with abkuerzung %s', (abkuerzung) => {
		expect(ruhetagRule.matches(tour(abkuerzung), ctx)).toBe(true);
	});

	it('does not match unrelated tours', () => {
		expect(ruhetagRule.matches(tour(SopreTourType.FERIEN), ctx)).toBe(false);
	});

	it('applies -1 to account 9047', () => {
		expect(ruhetagRule.apply(tour(SopreTourType.RUHETAGE), ctx)).toEqual({
			kind: 'apply',
			accountId: '9047',
			rule: 'RT -> 9047 (-1)',
			delta: -1
		});
	});
});

describe('kompensationstagRule', () => {
	it.each([
		SopreTourType.KOMPENSATIONSTAG,
		SopreTourType.KOMPENSATIONSTAG_VERLANGT,
		SopreTourType.KOMPENSATIONSTAG_TAUSCH,
		SopreTourType.GUTHABEN_KOMPENSATIONSTAG_PERSONAL
	])('matches tours with abkuerzung %s', (abkuerzung) => {
		expect(kompensationstagRule.matches(tour(abkuerzung), ctx)).toBe(true);
	});

	it('does not match unrelated tours', () => {
		expect(kompensationstagRule.matches(tour(SopreTourType.FERIEN), ctx)).toBe(false);
	});

	it('applies -1 to account 9046', () => {
		expect(kompensationstagRule.apply(tour(SopreTourType.KOMPENSATIONSTAG), ctx)).toEqual({
			kind: 'apply',
			accountId: '9046',
			rule: 'CT -> 9046 (-1)',
			delta: -1
		});
	});
});
