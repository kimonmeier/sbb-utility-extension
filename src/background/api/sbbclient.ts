import type {
	SopreMonthsRequest,
	TourenDetailRequest,
	ZeitkontenPeriodResponse
} from './types/sopretypes';

const BASE_API_ENDPOINT = 'https://sopreweb-tourenplan-api.app.sbb.ch';
const BASE_DETAIL_API_ENDPOINT = 'https://sopreweb-tourdetail-api.app.sbb.ch';
const BASE_ZEITKONTEN_API_ENDPOINT = 'https://sopreweb-zeitkonten-api.app.sbb.ch';
const MAX_RETRY_ATTEMPTS = 25;
const RETRY_BACKOFF_BASE_MS = 500;

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const MAX_LOGGED_BODY_LENGTH = 500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class SbbApiError extends Error {
	constructor(
		message: string,
		public readonly userMessage: string,
		public readonly context: {
			requestLabel: string;
			url: string;
			status?: number;
			attempt: number;
			requestId?: string | null;
			responseHeaders?: Record<string, string>;
			responseBody?: string;
		}
	) {
		super(message);
		this.name = 'SbbApiError';
	}
}

function isRetryableStatus(status: number): boolean {
	return RETRYABLE_STATUS_CODES.has(status);
}

function truncateForLog(value: string): string {
	if (value.length <= MAX_LOGGED_BODY_LENGTH) {
		return value;
	}

	return `${value.slice(0, MAX_LOGGED_BODY_LENGTH)}...`;
}

async function readResponseBodySafe(response: Response): Promise<string | undefined> {
	const text = await response
		.clone()
		.text()
		.catch(() => '');

	if (!text) {
		return undefined;
	}

	return truncateForLog(text);
}

function readResponseHeadersSafe(response: Response): Record<string, string> {
	const headers: Record<string, string> = {};

	for (const [key, value] of response.headers.entries()) {
		headers[key] = value;
	}

	return headers;
}

function createUserMessage(requestLabel: string, status?: number): string {
	if (status === 401 || status === 403) {
		return 'Authentication with SBB API failed. Please update your token in profile settings.';
	}

	if (status === 429) {
		return 'SBB API rate limit reached. Please try again in a few moments.';
	}

	if (typeof status === 'number' && status >= 500) {
		return 'SBB API is currently unavailable. Please try again later.';
	}

	return `${requestLabel}. Please try again later.`;
}

function logSbbApiError(error: SbbApiError, originalError?: unknown): void {
	console.error(
		`[SBB API] ${error.context.requestLabel} failed (attempt ${error.context.attempt}/${MAX_RETRY_ATTEMPTS})`,
		{
			url: error.context.url,
			status: error.context.status,
			requestId: error.context.requestId,
			responseHeaders: error.context.responseHeaders,
			responseBody: error.context.responseBody,
			message: error.message,
			userMessage: error.userMessage,
			cause: originalError instanceof Error ? originalError.message : originalError
		}
	);
}

async function requestJsonWithRetry<T>(
	url: string,
	init: RequestInit,
	requestLabel: string
): Promise<T> {
	for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
		let response: Response;

		try {
			response = await fetch(url, init);
		} catch (error) {
			if (attempt >= MAX_RETRY_ATTEMPTS) {
				const apiError = new SbbApiError(
					`${requestLabel} failed to reach SBB API after ${MAX_RETRY_ATTEMPTS} attempts.`,
					'SBB API could not be reached. Please try again later.',
					{
						requestLabel,
						url,
						attempt
					}
				);
				logSbbApiError(apiError, error);
				throw apiError;
			}

			await sleep(RETRY_BACKOFF_BASE_MS * 2 ** (attempt - 1));
			continue;
		}

		if (!response.ok) {
			const shouldRetryStatus = isRetryableStatus(response.status) && attempt < MAX_RETRY_ATTEMPTS;

			if (!shouldRetryStatus) {
				const responseBody = await readResponseBodySafe(response);
				const responseHeaders =
					response.status === 401 || response.status === 403
						? readResponseHeadersSafe(response)
						: undefined;
				const apiError = new SbbApiError(
					`${requestLabel} failed with status ${response.status}.`,
					createUserMessage(requestLabel, response.status),
					{
						requestLabel,
						url,
						status: response.status,
						attempt,
						requestId: response.headers.get('x-request-id'),
						responseHeaders,
						responseBody
					}
				);
				logSbbApiError(apiError);
				throw apiError;
			}

			await sleep(RETRY_BACKOFF_BASE_MS * 2 ** (attempt - 1));
			continue;
		}

		const contentType = response.headers.get('content-type') ?? '';
		const looksLikeJson = contentType.toLowerCase().includes('application/json');

		try {
			if (!looksLikeJson) {
				throw new Error(`Unexpected content-type: ${contentType || 'unknown'}`);
			}

			return (await response.json()) as T;
		} catch (error) {
			const responseBody = await readResponseBodySafe(response);
			const shouldRetry = attempt < MAX_RETRY_ATTEMPTS;

			if (!shouldRetry) {
				const apiError = new SbbApiError(
					`${requestLabel} returned invalid JSON after ${MAX_RETRY_ATTEMPTS} attempts.`,
					'SBB API returned an unexpected response. Please try again later.',
					{
						requestLabel,
						url,
						status: response.status,
						attempt,
						requestId: response.headers.get('x-request-id'),
						responseBody
					}
				);
				logSbbApiError(apiError, error);
				throw apiError;
			}

			await sleep(RETRY_BACKOFF_BASE_MS * 2 ** (attempt - 1));
		}
	}

	const apiError = new SbbApiError(
		`${requestLabel} failed for an unknown reason.`,
		`${requestLabel}. Please try again later.`,
		{
			requestLabel,
			url,
			attempt: MAX_RETRY_ATTEMPTS
		}
	);
	logSbbApiError(apiError);
	throw apiError;
}

export const sbbClient = {
	async getYear(token: string, year: number): Promise<SopreMonthsRequest> {
		return requestJsonWithRetry<SopreMonthsRequest>(
			`${BASE_API_ENDPOINT}/tourenplan/months?datumVon=${year}-01-01&months=12&tourdetail=false`,
			{
				method: 'GET',
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
					Authorization: `Bearer ${token}`
				}
			},
			'Error fetching SBB year data'
		);
	},
	async getMonth(token: string, year: number, month: number): Promise<SopreMonthsRequest> {
		return requestJsonWithRetry<SopreMonthsRequest>(
			`${BASE_API_ENDPOINT}/tourenplan/months?datumVon=${year}-${month.toString().padStart(2, '0')}-01&months=1&tourdetail=false`,
			{
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`
				}
			},
			'Error fetching SBB month data'
		);
	},
	async getTourDetail(token: string, tourId: number): Promise<TourenDetailRequest> {
		return requestJsonWithRetry<TourenDetailRequest>(
			`${BASE_DETAIL_API_ENDPOINT}/mitarbeiter/tourendetail?mitarbeiterTourId=${tourId}`,
			{
				headers: {
					Authorization: `Bearer ${token}`
				}
			},
			'Error fetching SBB tour detail'
		);
	},
	async getZeitkontenPeriod(token: string): Promise<ZeitkontenPeriodResponse> {
		return requestJsonWithRetry<ZeitkontenPeriodResponse>(
			`${BASE_ZEITKONTEN_API_ENDPOINT}/zeitkonten/period`,
			{
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`
				}
			},
			'Error fetching Zeitkonten period data'
		);
	}
};

export function toUserFacingSbbError(error: unknown, fallbackMessage: string): string {
	if (error instanceof SbbApiError) {
		return error.userMessage;
	}

	if (error instanceof Error && error.message) {
		return error.message;
	}

	return fallbackMessage;
}
