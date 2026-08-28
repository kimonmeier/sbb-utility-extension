import { isKompensationstagType, isRuhetagType } from '$background/caluclations/tour-helper';
import type { ProjectionRuleDefinition } from '$background/caluclations/rules/types';

export const ruhetagRule: ProjectionRuleDefinition = {
	name: 'Ruhetag',
	matches: (tour) => isRuhetagType(tour.abkuerzung),
	apply: () => ({ kind: 'apply', accountId: '9047', rule: 'RT -> 9047 (-1)', delta: -1 })
};

export const kompensationstagRule: ProjectionRuleDefinition = {
	name: 'Kompensationstag',
	matches: (tour) => isKompensationstagType(tour.abkuerzung),
	apply: () => ({ kind: 'apply', accountId: '9046', rule: 'CT -> 9046 (-1)', delta: -1 })
};
