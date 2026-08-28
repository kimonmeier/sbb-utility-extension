import type { ProjectionRuleDefinition } from '$background/caluclations/rules/types';
import { SopreTourType } from '@/background/api/types/sopretypes';
import type { FerienChargeAccount, ProjectionRule } from '$background/caluclations/types';

const FERIEN_RULE_BY_TARGET: Record<FerienChargeAccount, ProjectionRule> = {
	'9040': 'Ferienregel -> 9040 (-1 Arbeitstag)',
	'9046': 'Ferienregel -> 9046 (-1 Ausgleichstag)',
	'9047': 'Ferienregel -> 9047 (-1 Ruhetag)'
};

export const ferienRule: ProjectionRuleDefinition = {
	name: 'Ferien',
	matches: (tour) => tour.abkuerzung === SopreTourType.FERIEN,
	apply: (tour, ctx) => {
		const targetAccount = ctx.ferienChargeTargets.get(tour.datum);
		if (!targetAccount) {
			return { kind: 'ignore', reason: 'Ferien-Tag konnte nicht zugeordnet werden' };
		}

		return {
			kind: 'apply',
			accountId: targetAccount,
			rule: FERIEN_RULE_BY_TARGET[targetAccount],
			delta: -1
		};
	}
};
