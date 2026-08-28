export enum SopreTourType {
	KRANK = 'K',
	RUHETAGE = 'RT',
	KOMPENSATIONSTAG = 'CT',
	RUHETAG_VERLANGT = 'RTV',
	KOMPENSATIONSTAG_VERLANGT = 'CTV',
	RUHETAG_TAUSCH = 'RTT',
	KOMPENSATIONSTAG_TAUSCH = 'CTT',
	RESERVE = 'Res',
	RESERVE_FRÜH = 'Res F',
	RESERVE_SPÄT = 'Res S',
	FERIEN = 'Ferien',
	GUTHABEN_RUHETAG_PERSONAL = 'Guthaben Ruhetage Tag Personal',
	GUTHABEN_KOMPENSATIONSTAG_PERSONAL = 'Guthaben Kompensationstag Personal',
	WOHNUNGSWECHSEL = 'WW',
	NBU = 'NBU',
	UNBEKANNT = 'UNKNOWN'
}

export enum SopreDepot {
	OLTEN = 'OL',
	UNBEKANNT = 'UNKNOWN'
}

export type SopreMonthsRequest = SopreMontRequestDetails[];

export interface SopreMontRequestDetails {
	firstDate: string;
	lastDate: string;
	name: string;
	year: number;
	current: boolean;
	weekDTOs: WeekDto[];
}

export interface WeekDto {
	weekNumber: number;
	firstDate: string;
	lastDate: string;
	current: boolean;
	dayDTOs: DayDto[];
}

export interface DayDto {
	date: string;
	dayItemDTOs?: DayItemDto[];
	sameDay: boolean;
	unread: boolean;
	holiday: boolean;
	dayOfWeek?: string;
	filled: boolean;
}

export interface DayItemDto {
	date: string;
	dayOff: boolean;
	mitarbeiterTourId?: number;
	tournummer?: string;
	zuteilungsBemerkungAvailable?: boolean;
	tourSuffix?: string;
	geaendert?: boolean;
	startStandort?: string;
	endStandort?: string;
	tourStartzeit?: string;
	tourStartsPreviousDay?: boolean;
	tourEndzeit?: string;
	tourEndsNextDay?: boolean;
	lastEdit?: string;
	schichtlage?: string;
	has36hTour?: boolean;
	unread?: boolean;
	hasLeistungOverlap?: boolean;
	tourId?: number;
	qtqDatasetId?: string;
	tourArt?: string;
	hasNewModifications?: boolean;
	abkuerzung?: string;
	abwesenheitsartBeschreibung?: string;
	startzeit?: string;
	endzeit?: string;
	beschreibung?: string;
	reservetypBeschreibung?: string;
}

export interface TourenDetailRequest {
	zuteilungsbemerkung: string;
	lastMitarbeiterCheckUpdated: boolean;
	tourExecutionDate: string;
	replacedTourdetailDTO: ReplacedTourdetailDto;
	tourdetailDTO: TourdetailDto;
}

export interface ReplacedTourdetailDto {
	tourId: number;
	tournummer: string;
	tourSuffix: string;
	personalStandort: string;
	tourBemerkung: string;
	tourLetzteAenderung: string;
	arbeitsbeginn: string;
	arbeitsende: string;
	initialArbeitsbeginn: string;
	initialArbeitsende: string;
	schichtdauer: string;
	arbeitszeit: string;
	bezahlteZeit: string;
	bezahltePause: string;
}

export interface TourdetailDto {
	tourId: number;
	tournummer: string;
	tourSuffix: string | null;
	personalStandort: string;
	tourBemerkung: string | null;
	tourLetzteAenderung: string;
	arbeitsbeginn: string;
	arbeitsende: string;
	initialArbeitsbeginn: string;
	initialArbeitsende: string;
	schichtdauer: string;
	arbeitszeit: string;
	bezahlteZeit: string;
	bezahltePause: string;
}

export interface ZeitkontenPeriodEntry {
	sapLeaveTypeId: string;
	zeitsaldoBeschreibung: string;
	anzahl: string;
}

export type ZeitkontenPeriodResponse = ZeitkontenPeriodEntry[];
