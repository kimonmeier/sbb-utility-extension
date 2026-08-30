import type { CalculationLogEntry } from '$background/caluclations/rules/types';
import type { AccountId } from '$background/caluclations/types';

type QueryRequest = {
	GET_EPMLOYEES: {
		payload: undefined;
		response: {
			success: boolean;
			employees?: { id: string; name: string; employeeIdentification: string }[];
			error?: string;
		};
	};
	GET_EMPLOYEE_BY_ID: {
		payload: { employeeId: string };
		response: {
			success: boolean;
			employee?: { id: string; name: string; employeeIdentification: string };
			error?: string;
		};
	};
	GET_TOUREN: {
		payload: undefined;
		response: { success: boolean; touren?: { id: string; name: string }[]; error?: string };
	};
	GET_EMPLOYEE_FERIENANSPRUCH: {
		payload: { employeeId: string };
		response: {
			success: boolean;
			ferienanspruch?: { id: string; jahr: number; ferienAnspruchInTagen: number }[];
			error?: string;
		};
	};
	GET_EMPLOYEE_ARBEITSVERHAELTNIS: {
		payload: { employeeId: string };
		response: {
			success: boolean;
			arbeitsverhaeltnisse?: { id: string; von: Date; bis: Date | null; pensumProzent: number }[];
			error?: string;
		};
	};
	GET_ALL_EMPLOYEE_CALUCULATION: {
		payload: undefined;
		response: {
			success: boolean;
			calculations?: {
				id: string;
				name: string;
				employeeId: string;
				ruhetage: number;
				kompensationstage: number;
				ferien: number;
				logs: CalculationLogEntry[];
			}[];
			error?: string;
		};
	};
	GET_EMPLOYEE_CALUCULATION: {
		payload: { employeeId: string; year?: number };
		response: {
			success: boolean;
			calculation?: {
				year: number;
				scores: { ferien: number; kompensationstage: number; ruhetage: number };
				soll: { ruhetage: number; kompensationstage: number };
				geplant: { ruhetage: number; kompensationstage: number };
				ferienAnteil: { ruhetage: number; kompensationstage: number };
				kuerzungen: { ruhetage: number; kompensationstage: number; ferien: number };
				aktuell: Partial<Record<AccountId, number>>;
				log: CalculationLogEntry[];
			};
			error?: string;
		};
	};
};

type QueryRequestType = keyof QueryRequest;

export type QueryMessage = {
	[T in QueryRequestType]: {
		dbType: T;
		payload: QueryRequest[T]['payload'];
		response: QueryRequest[T]['response'];
	};
}[QueryRequestType];

type PostCommandRequest = {
	INSERT_EMPLOYEE: {
		payload: { name: string; employeeIdentification: string };
		response: { success: boolean; error?: string };
	};
	UPSERT_EMPLOYEE_FERIENANSPRUCH: {
		payload: { employeeId: string; jahr: number; ferienAnspruchInTagen: number };
		response: { success: boolean; error?: string };
	};
	INSERT_EMPLOYEE_ARBEITSVERHAELTNIS: {
		payload: { employeeId: string; von: Date; pensumProzent: number };
		response: { success: boolean; error?: string };
	};
};

type PostCommandRequestType = keyof PostCommandRequest;

export type PostCommandMessage = {
	[T in PostCommandRequestType]: {
		dbType: T;
		payload: PostCommandRequest[T]['payload'];
		response: PostCommandRequest[T]['response'];
	};
}[PostCommandRequestType];

type DeleteCommandRequest = {
	DELETE_EMPLOYEE: {
		payload: { employeeId: string };
		response: { success: boolean; error?: string };
	};
	DELETE_EMPLOYEE_FERIENANSPRUCH: {
		payload: { id: string };
		response: { success: boolean; error?: string };
	};
	DELETE_EMPLOYEE_ARBEITSVERHAELTNIS: {
		payload: { id: string };
		response: { success: boolean; error?: string };
	};
};

type DeleteCommandRequestType = keyof DeleteCommandRequest;

export type DeleteCommandMessage = {
	[T in DeleteCommandRequestType]: {
		dbType: T;
		payload: DeleteCommandRequest[T]['payload'];
		response: DeleteCommandRequest[T]['response'];
	};
}[DeleteCommandRequestType];
