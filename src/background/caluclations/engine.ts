import { collectFerienChargeTargets } from './holiday-schedule';
import { RUHETAGE_SOLL, type TourRow } from './types';
import { kompensationstagRule, ruhetagRule } from './rules/ruhetage/ruhetage';
import type {
	CalculationLogEntry,
	ProjectionRuleDefinition,
	RuleContext,
	RuleOutcome
} from './rules/types';
import { ferienRule } from './rules/ferien/ferien';
import { kuerzungenRule } from './rules/kuerzungen/kuerzungen';
import { collectKuerzungenChargeTargets } from './kuerzungen-helper';
import { countSaturdaysInYear, toDateString } from './date-helper';
import { toTourLabel } from './tour-helper';

export class CalulcationEngine {
	private rules: ProjectionRuleDefinition[];
	private ctx: RuleContext | undefined;

	constructor() {
		this.rules = [ruhetagRule, kompensationstagRule, ferienRule, kuerzungenRule];
	}

	public initContext(touren: TourRow[], year: number, ferienAnspruchInTagen: number): void {
		this.ctx = {
			ferienChargeTargets: collectFerienChargeTargets(touren),
			kuerzungenChargeTargets: collectKuerzungenChargeTargets(touren, year, ferienAnspruchInTagen),
			anzahlFerienAnspruchInTagen: ferienAnspruchInTagen,
			year
		};
	}

	public calculateScores(touren: TourRow[]): {
		ferien: number;
		kompensationstage: number;
		ruhetage: number;
		log: CalculationLogEntry[];
	} {
		if (!this.ctx) {
			throw new Error('Rule context not set');
		}

		let ferien = this.ctx.anzahlFerienAnspruchInTagen;
		let kompensationstage = countSaturdaysInYear(this.ctx.year);
		let ruhetage = RUHETAGE_SOLL;
		const log: CalculationLogEntry[] = [];

		for (const tour of touren) {
			const outcome = this.applyRules(tour);
			if (outcome.kind === 'apply') {
				if (outcome.accountId === '9040') {
					ferien += outcome.delta;
				} else if (outcome.accountId === '9046') {
					kompensationstage += outcome.delta;
				} else if (outcome.accountId === '9047') {
					ruhetage += outcome.delta;
				}
			}

			if (outcome.kind === 'apply' || outcome.reason !== 'No matching rule') {
				log.push({
					date: toDateString(tour.datum.getTime()),
					tourLabel: toTourLabel(tour),
					outcome
				});
			}
		}

		log.sort((a, b) => a.date.localeCompare(b.date));

		return { ferien, kompensationstage, ruhetage, log };
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
