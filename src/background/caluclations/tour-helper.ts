import { m } from '@/paraglide/messages';
import { SopreTourType } from '$background/api/types/sopretypes';
import type { TourRow } from './types';

export function toTourLabel(tour: TourRow): string {
	if (tour.tourNumber) {
		return m.touren_normal({ TourNumber: tour.tourNumber, TourSuffix: tour.tourSuffix ?? '' });
	}

	if (tour.abkuerzung) {
		return tour.abkuerzung;
	}

	return m.touren_unbekannt();
}

export function isRuhetagType(type?: string | null): boolean {
	return (
		type === SopreTourType.RUHETAGE ||
		type === SopreTourType.RUHETAG_VERLANGT ||
		type === SopreTourType.RUHETAG_TAUSCH ||
		type === SopreTourType.GUTHABEN_RUHETAG_PERSONAL
	);
}

export function isKompensationstagType(type?: string | null): boolean {
	return (
		type === SopreTourType.KOMPENSATIONSTAG ||
		type === SopreTourType.KOMPENSATIONSTAG_VERLANGT ||
		type === SopreTourType.KOMPENSATIONSTAG_TAUSCH ||
		type === SopreTourType.GUTHABEN_KOMPENSATIONSTAG_PERSONAL
	);
}

export function isReserveType(type?: string | null): boolean {
	return (
		type === SopreTourType.RESERVE ||
		type === SopreTourType.RESERVE_FRÜH ||
		type === SopreTourType.RESERVE_SPÄT
	);
}

export function isAbwesend(type?: string | null): boolean {
	return (
		type === SopreTourType.KRANK ||
		type === SopreTourType.NICHTBERUFSUNFALL ||
		type === SopreTourType.BERUFSUNFALL ||
		type === SopreTourType.UNBEZAHLTER_URLAUB
	);
}
