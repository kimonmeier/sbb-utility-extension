import type { touren, zeitkontenSnapshots } from '$background/db/schema';

export const TRACKED_ACCOUNT_IDS = ['5', '9040', '9046', '9047', '9054'] as const;

export type AccountId = (typeof TRACKED_ACCOUNT_IDS)[number];
export type TourRow = typeof touren.$inferSelect;
export type SnapshotRow = typeof zeitkontenSnapshots.$inferSelect;

export type FerienChargeAccount = '9040' | '9046' | '9047';

export type ProjectionRule =
	| 'RT -> 9047 (-1)'
	| 'CT -> 9046 (-1)'
	| 'Ferienregel -> 9040 (-1 Arbeitstag)'
	| 'Ferienregel -> 9046 (-1 Ausgleichstag)'
	| 'Ferienregel -> 9047 (-1 Ruhetag)'
	| 'Reserve -> 5 (fix 8.2h)'
	| 'Arbeitszeit -> 5 (bezahlteZeit - 8.2h)';

export interface HistoryPoint {
	snapshotDate: string;
	accountId: AccountId;
	description: string;
	value: number;
}

export interface ProjectionEvent {
	date: string;
	tourLabel: string;
	accountId: AccountId;
	rule: ProjectionRule;
	delta: number;
	resultBalance: number;
}

export interface IgnoredTour {
	date: string;
	tourLabel: string;
	reason: string;
}

export interface RestDayEstimate {
	date: string;
	type: 'RT' | 'CT';
	reason: string;
}
