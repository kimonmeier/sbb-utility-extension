import { SopreTourType } from '$background/api/types/sopretypes';
import type { FerienChargeAccount, TourRow } from './types';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function collectFerienChargeTargets(tours: TourRow[]): Map<number, FerienChargeAccount> {
	const holidays = tours
		.filter((tour) => tour.abkuerzung === SopreTourType.FERIEN)
		.map((tour) => tour.datum)
		.sort((a, b) => a - b);

	const targets = new Map<number, FerienChargeAccount>();
	for (const chunk of groupToChunks(holidays)) {
		assignChunkChargeTargets(chunk, targets);
	}

	return targets;
}

function groupToChunks(sortedDays: number[]): number[][] {
	const chunks: number[][] = [];
	let current: number[] = [];

	for (const day of sortedDays) {
		const previous = current.at(-1);
		const isConsecutive = previous != null && day - previous <= ONE_DAY_MS + 1;

		if (current.length === 0 || isConsecutive) {
			current.push(day);
			continue;
		}

		chunks.push(current);
		current = [day];
	}

	if (current.length > 0) {
		chunks.push(current);
	}

	return chunks;
}

function assignChunkChargeTargets(
	chunk: number[],
	chargeTargets: Map<number, FerienChargeAccount>
) {
	const firstWindow = chunk.slice(0, 8);
	setTargetKonto(firstWindow.slice(0, 1), '9046', chargeTargets);
	setTargetKonto(firstWindow.slice(1, 2), '9047', chargeTargets);
	setTargetKonto(firstWindow.slice(2, 7), '9040', chargeTargets);
	setTargetKonto(firstWindow.slice(7, 8), '9046', chargeTargets);

	for (let index = 8; index < chunk.length; index += 7) {
		const window = chunk.slice(index, index + 7);
		setTargetKonto(window.slice(0, 1), '9047', chargeTargets);
		setTargetKonto(window.slice(1, 6), '9040', chargeTargets);
		setTargetKonto(window.slice(6, 7), '9046', chargeTargets);
	}
}

function setTargetKonto(
	days: number[],
	account: FerienChargeAccount,
	chargeTargets: Map<number, FerienChargeAccount>
) {
	for (const day of days) {
		chargeTargets.set(day, account);
	}
}
