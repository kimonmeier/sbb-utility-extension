import { createWorkerListener } from './messages/messageReciever';
import { sendOffscreenDataMessage, sendOffscreenMessage } from './messages/messageSender';

const TARGET_URLS = ['https://sopreweb-tourenplan-api.app.sbb.ch/mitarbeiter/check*'];

let currentToken: string | null = null;

// Ensure only one offscreen document exists
async function setupOffscreenDocument() {
	const offscreenUrl = chrome.runtime.getURL('offscreen.html');
	const existingContexts = await chrome.runtime.getContexts({
		contextTypes: ['OFFSCREEN_DOCUMENT'],
		documentUrls: [offscreenUrl]
	});

	if (existingContexts.length > 0) return;

	await chrome.offscreen.createDocument({
		url: 'offscreen.html',
		reasons: ['WORKERS'],
		justification: 'Run SQLite Wasm database in Web Worker'
	});
}

chrome.runtime.onInstalled.addListener(async () => {
	await setupOffscreenDocument();

	const initResult = await sendOffscreenMessage('INIT_DB');

	createWorkerListener({
		SYNC_API_WORKER: async () => {
			if (!currentToken) {
				return { success: false, error: 'Es wurde kein Token gefunden!' };
			}

			return await sendOffscreenMessage('SYNC_API', {
				api_token: currentToken
			});
		},
		// Example: fan out a data message by its `dbType` and forward it to the
		// offscreen document, where the actual SQLite access happens.
		QUERY_DB: {
			GET_EPMLOYEES: async () => {
				return await sendOffscreenDataMessage('QUERY_DB', 'GET_EPMLOYEES');
			},
			GET_TOUREN: async () => {
				return await sendOffscreenDataMessage('QUERY_DB', 'GET_TOUREN');
			}
		},
		INSERT_DB: {
			INSERT_EMPLOYEE: async (payload) => {
				return await sendOffscreenDataMessage('INSERT_DB', 'INSERT_EMPLOYEE', payload);
			}
		},
		DELETE_DB: {
			DELETE_EMPLOYEE: async (payload) => {
				return await sendOffscreenDataMessage('DELETE_DB', 'DELETE_EMPLOYEE', payload);
			}
		}
	});

	console.log('Database initialized in offscreen document:', initResult);
});

chrome.webRequest.onBeforeSendHeaders.addListener(
	(details) => {
		if (!details.requestHeaders) {
			return;
		}

		for (const header of details.requestHeaders) {
			if (header.name.toLowerCase() === 'authorization') {
				const authValue = header.value!;

				if (authValue.toLowerCase().startsWith('bearer ')) {
					const token = authValue.substring(7);
					currentToken = token;
					break;
				}
			}
		}
		return { requestHeaders: details.requestHeaders };
	},
	{ urls: TARGET_URLS },
	['requestHeaders']
);
