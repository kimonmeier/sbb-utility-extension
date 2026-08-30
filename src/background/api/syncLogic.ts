import { and, eq, inArray } from 'drizzle-orm';
import {
	touren,
	zeitkontenSnapshots,
	type SBBUtilityTouren,
	type SBBUtilityZeitkontoSnapshot
} from '$background/db/schema';
import { SopreDepot, SopreTourType, type SopreMonthsRequest } from './types/sopretypes';
import { sbbClient, toUserFacingSbbError } from './sbbclient';
import { db } from '$background/db/db';
import { TRACKED_ACCOUNT_IDS } from '$background/caluclations/types';

type PersistedTour = typeof touren.$inferSelect;
type TourItem = ReturnType<typeof flattenTourItems>[number];

const TIME_ZONE = 'Europe/Zurich';
const TRACKED_ACCOUNT_IDS_SET = [...TRACKED_ACCOUNT_IDS];

function parseZonedDateTime(value: string): Date {
	const match = value
		.trim()
		.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
	if (!match) {
		throw new Error(`Unrecognized date/time value from SBB API: "${value}"`);
	}

	const [, year, month, day, hour, minute, second] = match;
	const utcGuess = Date.UTC(
		Number(year),
		Number(month) - 1,
		Number(day),
		hour ? Number(hour) : 0,
		minute ? Number(minute) : 0,
		second ? Number(second) : 0
	);

	const offsetMinutes = getTimeZoneOffsetMinutes(new Date(utcGuess), TIME_ZONE);
	return new Date(utcGuess - offsetMinutes * 60_000);
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	}).formatToParts(date);

	const lookup: Record<string, string> = {};
	for (const part of parts) {
		lookup[part.type] = part.value;
	}

	const asUtc = Date.UTC(
		Number(lookup.year),
		Number(lookup.month) - 1,
		Number(lookup.day),
		Number(lookup.hour),
		Number(lookup.minute),
		Number(lookup.second)
	);

	return (asUtc - date.getTime()) / 60_000;
}

function addDaysToDateString(dateStr: string, days: number): string {
	const [year, month, day] = dateStr.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function todayInZurich(): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date());
}

export async function synchronizeTourenForAllEmployees(
	api_token: string
): Promise<{ success: boolean; error?: string }> {
	const employees = await db.query.employee.findMany();

	const retVal: { success: boolean; error?: string } = { success: true };
	for (const employee of employees) {
		try {
			await synchronizeTouren(employee.id, employee.employeeId, api_token);
		} catch (error) {
			retVal.success = false;
			if (retVal.error) {
				retVal.error += `\nFailed to synchronize touren for employee ${employee.name} (${employee.id}): ${error}`;
			} else {
				retVal.error = `Failed to synchronize touren for employee ${employee.name} (${employee.id}): ${error}`;
			}
			console.error(error);
		}
	}

	return retVal;
}

async function synchronizeTouren(
	employeeId: string,
	employeeIndentification: string,
	api_token: string
) {
	const tourenData = await fetchTourenYearDataOrThrow(api_token);
	console.log('Fetched touren data from SBB API:', tourenData);

	const uniqueTourItemsByDay = buildUniqueTourItemsByDay(flattenTourItems(tourenData));
	if (uniqueTourItemsByDay.size === 0) {
		return;
	}

	const existingTourenByDay = await fetchExistingTourenByDay(
		employeeId,
		Array.from(uniqueTourItemsByDay.keys())
	);
	const processedTouren = await processTourenData(
		Array.from(uniqueTourItemsByDay.values()),
		employeeId,
		api_token,
		existingTourenByDay
	);

	if (processedTouren.length > 0) {
		await upsertTourenForUser(
			employeeId,
			deduplicateTourenByDay(processedTouren),
			existingTourenByDay
		);
	}

	await synchronizeZeitkonten(employeeId, api_token);
}

const TOUR_TYPE_BY_CODE: Record<string, SopreTourType> = {
	K: SopreTourType.KRANK,
	RT: SopreTourType.RUHETAGE,
	CT: SopreTourType.KOMPENSATIONSTAG,
	RTV: SopreTourType.RUHETAG_VERLANGT,
	RTT: SopreTourType.RUHETAG_TAUSCH,
	CTV: SopreTourType.KOMPENSATIONSTAG_VERLANGT,
	CTT: SopreTourType.KOMPENSATIONSTAG_TAUSCH,
	RTP: SopreTourType.GUTHABEN_RUHETAG_PERSONAL,
	CTP: SopreTourType.GUTHABEN_KOMPENSATIONSTAG_PERSONAL,
	UUZ: SopreTourType.WOHNUNGSWECHSEL,
	NBU: SopreTourType.NICHTBERUFSUNFALL,
	BU: SopreTourType.BERUFSUNFALL,
	UUB: SopreTourType.UNBEZAHLTER_URLAUB,
	F: SopreTourType.FERIEN
};

async function synchronizeZeitkonten(employeeId: string, token: string) {
	let zeitkontenData;
	try {
		zeitkontenData = await sbbClient.getZeitkontenPeriod(token);
	} catch (error) {
		throw new Error(toUserFacingSbbError(error, 'Failed to fetch Zeitkonten data from SBB API.'), {
			cause: error
		});
	}

	const currentSnapshotDate = todayInZurich();
	const selectedEntries = zeitkontenData.filter((entry) =>
		TRACKED_ACCOUNT_IDS_SET.find((x) => x == entry.sapLeaveTypeId)
	);

	if (selectedEntries.length === 0) {
		return;
	}

	await db
		.delete(zeitkontenSnapshots)
		.where(
			and(
				eq(zeitkontenSnapshots.employee, employeeId),
				eq(zeitkontenSnapshots.snapshotDate, currentSnapshotDate)
			)
		);

	const snapshots: SBBUtilityZeitkontoSnapshot[] = selectedEntries.map((entry) => ({
		id: crypto.randomUUID(),
		employee: employeeId,
		snapshotDate: currentSnapshotDate,
		sapLeaveTypeId: entry.sapLeaveTypeId,
		zeitsaldoBeschreibung: entry.zeitsaldoBeschreibung,
		anzahl: entry.anzahl
	}));

	await db.insert(zeitkontenSnapshots).values(snapshots);
}

async function processTourenData(
	tourItems: TourItem[],
	userId: string,
	token: string,
	existingTourenByDay: Map<number, PersistedTour>
): Promise<SBBUtilityTouren[]> {
	return Promise.all(
		tourItems.map(async (item) => {
			const tour = createBaseTour(item, userId);
			const existingTour = existingTourenByDay.get(tour.datum.getTime());

			if (item.dayOff) {
				tour.abkuerzung = parseTourType(item.abkuerzung!);
				return tour;
			}

			if (!item.tournummer) {
				applyReserveFields(item, tour);
				return tour;
			}

			applyPlannedTourFields(item, tour);

			if (existingTour && isSameBaseTour(existingTour, tour)) {
				copyPersistedDetailFields(existingTour, tour);
				return tour;
			}

			const tourDetail = await fetchTourDetailSafely(token, item.mitarbeiterTourId);
			applyTourDetailFields(tour, tourDetail);

			return tour;
		})
	);
}

async function fetchTourenYearDataOrThrow(token: string): Promise<SopreMonthsRequest> {
	const currentYear = new Date().getFullYear();

	try {
		return await sbbClient.getYear(token, currentYear);
	} catch (error) {
		throw new Error(toUserFacingSbbError(error, 'Failed to fetch touren data from SBB API.'), {
			cause: error
		});
	}
}

function buildUniqueTourItemsByDay(items: TourItem[]): Map<number, TourItem> {
	if (items.length === 0) {
		return new Map();
	}

	const tourItemByDay = new Map<number, TourItem[]>();
	for (const item of items) {
		const day = parseZonedDateTime(item.date).getTime();
		if (!tourItemByDay.has(day)) {
			tourItemByDay.set(day, []);
		}
		tourItemByDay.get(day)!.push(item);
	}

	const uniqueTourItemByDay = new Map<number, TourItem>();
	for (const [day, items] of tourItemByDay.entries()) {
		uniqueTourItemByDay.set(day, chooseTourItemForDay(items));
	}

	return uniqueTourItemByDay;
}

function chooseTourItemForDay(items: TourItem[]): TourItem {
	if (items.length === 1) {
		return items[0];
	}

	// Find the Ferien item only if all items have an abkuerzung and there's at least one Ferien and one Ruhetag or Kompensationstag
	if (
		items.every((x) => x.abkuerzung) &&
		items.find((x) => TOUR_TYPE_BY_CODE[x.abkuerzung!] === SopreTourType.FERIEN) &&
		(items.find((x) => TOUR_TYPE_BY_CODE[x.abkuerzung!] == SopreTourType.RUHETAGE) ||
			items.find((x) => TOUR_TYPE_BY_CODE[x.abkuerzung!] === SopreTourType.KOMPENSATIONSTAG))
	) {
		return items.find((x) => TOUR_TYPE_BY_CODE[x.abkuerzung!] === SopreTourType.FERIEN)!;
	}

	if (
		items.find((x) => !x.abkuerzung) &&
		items.find(
			(x) => x.abkuerzung === 'Res F' || x.abkuerzung === 'Res S' || x.abkuerzung === 'Res'
		)
	) {
		return items.find((x) => !x.abkuerzung)!;
	}

	if (items.find((x) => x.dayOff) && items.find((x) => !x.dayOff)) {
		return items.find((x) => !x.dayOff)!;
	}

	return items[0];
}

async function fetchExistingTourenByDay(
	employeeId: string,
	days: number[]
): Promise<Map<number, PersistedTour>> {
	if (days.length === 0) {
		return new Map();
	}

	const existingTouren = await db.query.touren.findMany({
		where: and(
			eq(touren.employee, employeeId),
			inArray(
				touren.datum,
				days.map((day) => new Date(day))
			)
		)
	});

	return new Map(existingTouren.map((row) => [row.datum.getTime(), row]));
}

function deduplicateTourenByDay(tours: SBBUtilityTouren[]): SBBUtilityTouren[] {
	const tourenByDay = new Map<number, SBBUtilityTouren>();
	for (const row of tours) {
		tourenByDay.set(row.datum.getTime(), row);
	}

	return Array.from(tourenByDay.values());
}

async function upsertTourenForUser(
	userId: string,
	processedTouren: SBBUtilityTouren[],
	existingTourenByDay: Map<number, PersistedTour>
) {
	const existingDays = new Set(existingTourenByDay.keys());
	const toInsert = processedTouren.filter((row) => !existingDays.has(row.datum.getTime()));
	const toUpdate = processedTouren.filter((row) => existingDays.has(row.datum.getTime()));

	if (toInsert.length > 0) {
		await db.insert(touren).values(toInsert);
	}

	if (toUpdate.length > 0) {
		await Promise.all(toUpdate.map((row) => updateTourForDay(userId, row)));
	}
}

async function updateTourForDay(employeeId: string, row: SBBUtilityTouren) {
	await db
		.update(touren)
		.set(buildTourUpdatePayload(row))
		.where(and(eq(touren.employee, employeeId), eq(touren.datum, row.datum)));
}

function buildTourUpdatePayload(row: SBBUtilityTouren) {
	return {
		abkuerzung: row.abkuerzung,
		tourNumber: row.tourNumber,
		depot: row.depot,
		lastEdited: row.lastEdited,
		startTime: row.startTime,
		endTime: row.endTime,
		aenderungKommentar: row.aenderungKommentar,
		tourSuffix: row.tourSuffix,
		schichtdauer: row.schichtdauer,
		arbeitszeit: row.arbeitszeit,
		bezahlteZeit: row.bezahlteZeit,
		bezahltePause: row.bezahltePause
	};
}

function createBaseTour(item: TourItem, employeeId: string): SBBUtilityTouren {
	return {
		id: crypto.randomUUID(),
		datum: parseZonedDateTime(item.date),
		employee: employeeId,
		abkuerzung: SopreTourType.UNBEKANNT
	};
}

function applyReserveFields(item: TourItem, tour: SBBUtilityTouren): void {
	if (item.reservetypBeschreibung) {
		tour.abkuerzung = SopreTourType.RESERVE;
	}

	if (item.schichtlage?.includes('FRUEH')) {
		tour.abkuerzung = SopreTourType.RESERVE_FRÜH;
	} else if (item.schichtlage?.includes('SPAET')) {
		tour.abkuerzung = SopreTourType.RESERVE_SPÄT;
	}

	if (item.lastEdit) {
		tour.lastEdited = parseZonedDateTime(item.lastEdit);
	}
}

function applyPlannedTourFields(item: TourItem, tour: SBBUtilityTouren): void {
	const endDate = item.tourEndsNextDay ? addDaysToDateString(item.date, 1) : item.date;

	tour.tourNumber = parseInt(item.tournummer!, 10);
	tour.startTime = parseZonedDateTime(`${item.date} ${item.tourStartzeit}`);
	tour.endTime = parseZonedDateTime(`${endDate} ${item.tourEndzeit}`);
	tour.depot = parseStandort(item.startStandort);
	tour.tourSuffix = item.tourSuffix;
}

async function fetchTourDetailSafely(token: string, mitarbeiterTourId?: number | null) {
	if (!mitarbeiterTourId) {
		return null;
	}

	try {
		return await sbbClient.getTourDetail(token, mitarbeiterTourId);
	} catch (error) {
		console.warn(
			`Skipping tour detail fetch for mitarbeiterTourId ${mitarbeiterTourId}:`,
			toUserFacingSbbError(error, 'Failed to fetch tour detail from SBB API.')
		);
		return null;
	}
}

function applyTourDetailFields(
	tour: SBBUtilityTouren,
	tourDetail: Awaited<ReturnType<typeof fetchTourDetailSafely>>
) {
	if (tourDetail?.tourdetailDTO) {
		tour.schichtdauer = parseDurationToMinutes(tourDetail.tourdetailDTO.schichtdauer);
		tour.arbeitszeit = parseDurationToMinutes(tourDetail.tourdetailDTO.arbeitszeit);
		tour.bezahlteZeit = parseDurationToMinutes(tourDetail.tourdetailDTO.bezahlteZeit);
		tour.bezahltePause = parseDurationToMinutes(tourDetail.tourdetailDTO.bezahltePause);
	}

	if (tourDetail?.zuteilungsbemerkung) {
		tour.aenderungKommentar = tourDetail.zuteilungsbemerkung;
	}
}

function flattenTourItems(tourenData: SopreMonthsRequest) {
	return tourenData.flatMap((month) =>
		month.weekDTOs.flatMap((week) => week.dayDTOs.flatMap((day) => day.dayItemDTOs || []))
	);
}

function toTimestamp(value: Date | null | undefined): number | null {
	return value ? value.getTime() : null;
}

function isSameBaseTour(existingTour: typeof touren.$inferSelect, nextTour: SBBUtilityTouren) {
	if (existingTour.abkuerzung !== nextTour.abkuerzung) {
		return false;
	}

	if (existingTour.tourNumber !== nextTour.tourNumber) {
		return false;
	}

	if (existingTour.tourSuffix !== nextTour.tourSuffix) {
		return false;
	}

	if (existingTour.depot !== nextTour.depot) {
		return false;
	}

	if (toTimestamp(existingTour.startTime) !== toTimestamp(nextTour.startTime)) {
		return false;
	}

	if (toTimestamp(existingTour.endTime) !== toTimestamp(nextTour.endTime)) {
		return false;
	}

	if (toTimestamp(existingTour.lastEdited) !== toTimestamp(nextTour.lastEdited)) {
		return false;
	}

	return true;
}

function copyPersistedDetailFields(
	existingTour: typeof touren.$inferSelect,
	nextTour: SBBUtilityTouren
) {
	nextTour.schichtdauer = existingTour.schichtdauer ?? undefined;
	nextTour.arbeitszeit = existingTour.arbeitszeit ?? undefined;
	nextTour.bezahlteZeit = existingTour.bezahlteZeit ?? undefined;
	nextTour.bezahltePause = existingTour.bezahltePause ?? undefined;
	nextTour.aenderungKommentar = existingTour.aenderungKommentar ?? undefined;
}

function parseStandort(standort: string | undefined): SopreDepot {
	if (standort === 'OL') {
		return SopreDepot.OLTEN;
	}

	return SopreDepot.UNBEKANNT;
}

function parseTourType(abkuerzung: string): SopreTourType {
	return TOUR_TYPE_BY_CODE[abkuerzung] ?? SopreTourType.UNBEKANNT;
}

function parseDurationToMinutes(value?: string | null): number | undefined {
	const trimmed = value?.trim();
	if (!trimmed) {
		return undefined;
	}

	if (/^\d+$/.test(trimmed)) {
		return parseInt(trimmed, 10);
	}

	const hhmmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
	if (hhmmMatch) {
		const hours = parseInt(hhmmMatch[1], 10);
		const minutes = parseInt(hhmmMatch[2], 10);
		const seconds = hhmmMatch[3] ? parseInt(hhmmMatch[3], 10) : 0;
		return hours * 60 + minutes + (seconds >= 30 ? 1 : 0);
	}

	const isoMatch = trimmed.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
	if (isoMatch) {
		const hours = isoMatch[1] ? parseInt(isoMatch[1], 10) : 0;
		const minutes = isoMatch[2] ? parseInt(isoMatch[2], 10) : 0;
		return hours * 60 + minutes;
	}

	const humanMatch = trimmed.match(/^(\d+)\s*h(?:\s*(\d+)\s*m?)?$/i);
	if (humanMatch) {
		const hours = parseInt(humanMatch[1], 10);
		const minutes = humanMatch[2] ? parseInt(humanMatch[2], 10) : 0;
		return hours * 60 + minutes;
	}

	return undefined;
}
