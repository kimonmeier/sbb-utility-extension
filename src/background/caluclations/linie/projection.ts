import { addDaysToDateKey } from '$background/caluclations/date-helper';
import { planTagFor } from './rotation';
import { toPlanEintrag, type PlanEintrag, type Wochenschema } from './types';

export interface HochgerechneterTag extends PlanEintrag {
	dateKey: string;
	wochenfolge: number;
	wochentag: number;
}

/**
 * Rechnet den Tourenablauf einer Linie fuer einen Zeitraum hoch.
 *
 * `von` und `bis` sind einschliessend. Ist `von` groesser als `bis`, gibt es
 * nichts hochzurechnen -- das ist der Normalfall, sobald die SBB die restlichen
 * Touren publiziert hat.
 */
export function hochrechnen(
	schema: Wochenschema,
	linie: number,
	von: string,
	bis: string
): HochgerechneterTag[] {
	const tage: HochgerechneterTag[] = [];

	for (let dateKey = von; dateKey <= bis; dateKey = addDaysToDateKey(dateKey, 1)) {
		const planTag = planTagFor(schema, linie, dateKey);
		tage.push({
			dateKey,
			wochenfolge: planTag.wochenfolge,
			wochentag: planTag.wochentag,
			...toPlanEintrag(planTag.eintrag)
		});
	}

	return tage;
}
