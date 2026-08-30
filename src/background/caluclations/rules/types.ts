import type {
	AccountId,
	FerienChargeAccount,
	ProjectionRule,
	TourRow
} from '$background/caluclations/types';

export interface RuleContext {
	ferienChargeTargets: Map<number, FerienChargeAccount>;
	kuerzungenChargeTargets: Map<number, AccountId>;
	anzahlFerienAnspruchInTagen: number;
	year: number;
}

export interface ProjectionRuleDefinition {
	name: string;
	matches: (tour: TourRow, ctx: RuleContext) => boolean;
	apply: (tour: TourRow, ctx: RuleContext) => RuleOutcome;
}

export type RuleOutcome =
	| { kind: 'apply'; accountId: AccountId; rule: ProjectionRule; delta: number }
	| { kind: 'ignore'; reason: string };

export interface CalculationLogEntry {
	date: string;
	tourLabel: string;
	outcome: RuleOutcome;
}
