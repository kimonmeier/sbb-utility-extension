import { collectFerienChargeTargets } from './holiday-schedule';
import type { TourRow } from './types';
import { kompensationstagRule, ruhetagRule } from './rules/ruhetage/ruhetage';
import type { ProjectionRuleDefinition, RuleContext, RuleOutcome } from './rules/types';

export class CalulcationEngine {
	private rules: ProjectionRuleDefinition[];
	private ctx: RuleContext | undefined;

	constructor() {
		this.rules = [ruhetagRule, kompensationstagRule];
	}

	public initContext(touren: TourRow[]): void {
		this.ctx = {
			ferienChargeTargets: collectFerienChargeTargets(touren)
		};
	}

	public applyRules(tour: TourRow): RuleOutcome {
		if (!this.ctx) {
			throw new Error('Rule context not set');
		}

		for (const rule of this.rules) {
			if (rule.matches(tour, this.ctx)) {
				return rule.apply(tour, this.ctx);
			}
		}
		return { kind: 'ignore', reason: 'No matching rule' };
	}
}
