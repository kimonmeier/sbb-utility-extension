import { SopreTourType } from '$background/api/types/sopretypes';
import { coundDaysinYear as countDaysinYear, countSaturdaysInYear } from './date-helper';
import { isAbwesend } from './tour-helper';
import type { KuerzungenChargeAccount, TourRow } from './types';

export function collectKuerzungenChargeTargets(
	touren: TourRow[],
	year: number,
	ferienAnspruchInTagen: number
): Map<number, KuerzungenChargeAccount> {
	const kuerzungen = new Map<number, KuerzungenChargeAccount>();

	const abwesenheiten = touren.filter((tour) => isAbwesend(tour.abkuerzung));

	assignKuerzungenKompensationstage(abwesenheiten, year).forEach((value, key) => {
		kuerzungen.set(key, value);
	});
	assignKuerzungenRuhetage(abwesenheiten, year).forEach((value, key) => {
		kuerzungen.set(key, value);
	});
	assignKuerzungenFerien(abwesenheiten, year, ferienAnspruchInTagen).forEach((value, key) => {
		kuerzungen.set(key, value);
	});

	return kuerzungen;
}

function assignKuerzungenKompensationstage(
	abwesenheiten: TourRow[],
	year: number
): Map<number, KuerzungenChargeAccount> {
	if (abwesenheiten.length <= 5) {
		return new Map<number, KuerzungenChargeAccount>();
	}

	const kuerzungen = new Map<number, KuerzungenChargeAccount>();

	const anzahlTageZumKuerzen = Math.round(
		(countSaturdaysInYear(year) * abwesenheiten.length) / countDaysinYear(year)
	);

	for (let i = 0; i < anzahlTageZumKuerzen; i++) {
		const abwesenheit = abwesenheiten[i];
		if (abwesenheit) {
			kuerzungen.set(abwesenheit.datum, '9046');
		}
	}

	return kuerzungen;
}

function assignKuerzungenRuhetage(
	abwesenheiten: TourRow[],
	year: number
): Map<number, KuerzungenChargeAccount> {
	if (abwesenheiten.length <= 5) {
		return new Map<number, KuerzungenChargeAccount>();
	}
	const kuerzungen = new Map<number, KuerzungenChargeAccount>();

	const anzahlTageZumKuerzen = Math.floor((63 * abwesenheiten.length) / countDaysinYear(year));

	for (let i = anzahlTageZumKuerzen; i < anzahlTageZumKuerzen * 2; i++) {
		const abwesenheit = abwesenheiten[i];
		if (abwesenheit) {
			kuerzungen.set(abwesenheit.datum, '9047');
		}
	}

	return kuerzungen;
}

function assignKuerzungenFerien(
	abwesenheiten: TourRow[],
	year: number,
	ferienAnspruchInTagen: number
): Map<number, KuerzungenChargeAccount> {
	const kuerzungen = new Map<number, KuerzungenChargeAccount>();

	const unbezahlterUrlaub = abwesenheiten.filter(
		(tour) => tour.abkuerzung === SopreTourType.UNBEZAHLTER_URLAUB
	);

	const andereAbwesenheiten = abwesenheiten.filter(
		(tour) => tour.abkuerzung != SopreTourType.UNBEZAHLTER_URLAUB
	);

	let anrechenebareTage = 0;
	if (unbezahlterUrlaub.length > 30 && andereAbwesenheiten.length > 90) {
		anrechenebareTage = unbezahlterUrlaub.length - 30 + (andereAbwesenheiten.length - 90);
	} else if (unbezahlterUrlaub.length > 30) {
		anrechenebareTage = unbezahlterUrlaub.length - 30;
	} else if (andereAbwesenheiten.length > 90) {
		anrechenebareTage = andereAbwesenheiten.length - 90;
	}

	const anzahlTageZumKuerzen = Math.floor(
		(ferienAnspruchInTagen * anrechenebareTage) / countDaysinYear(year)
	);

	for (let i = anzahlTageZumKuerzen * 2; i < anzahlTageZumKuerzen * 3; i++) {
		const abwesenheit = abwesenheiten[i];
		if (abwesenheit) {
			kuerzungen.set(abwesenheit.datum, '9040');
		}
	}

	return kuerzungen;
}
