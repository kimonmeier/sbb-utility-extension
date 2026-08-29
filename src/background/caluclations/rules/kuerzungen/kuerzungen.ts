import { isAbwesend } from '$background/caluclations/tour-helper';
import type { ProjectionRuleDefinition } from '$background/caluclations/rules/types';
import type { ProjectionRule } from '$background/caluclations/types';

export const kuerzungenRule: ProjectionRuleDefinition = {
	name: 'Kürzungen',
	matches: (tour) => isAbwesend(tour.abkuerzung),
	apply: (tour, ctx) => {
		const targetAccount = ctx.kuerzungenChargeTargets.get(tour.datum);
		if (!targetAccount) {
			return { kind: 'ignore', reason: 'Kuürzung-Tag konnte nicht zugeordnet werden' };
		}

		let rule: ProjectionRule;
		if (targetAccount === '9040') {
			rule = 'Kuerzung Ferien (9040 -1)';
		} else if (targetAccount === '9046') {
			rule = 'Kuerzung Kompensationstag (9046 -1)';
		} else if (targetAccount === '9047') {
			rule = 'Kuerzung Ruhetag (9047 -1)';
		} else {
			return { kind: 'ignore', reason: 'Unbekanntes Zielkonto für Kürzung' };
		}

		return {
			kind: 'apply',
			accountId: targetAccount,
			rule: rule,
			delta: -1
		};
	}
};
