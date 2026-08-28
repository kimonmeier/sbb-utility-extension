/* eslint-disable  @typescript-eslint/no-explicit-any */
import {
	MessageTargets,
	type MessageType,
	type OffscreenDataMessageRegistry,
	type OffscreenMessageRegistry,
	type WorkerDataMessageRegistry,
	type WorkerMessageRegistry
} from './messages';

// Defines an object where the keys are MessageTypes and the values are functions
// that take the correct payload and return the correct Promise response.
type GenericHandlers = Partial<
	Record<
		MessageType,
		Record<string, (payload: any) => Promise<any>> | ((payload: any) => Promise<any>)
	>
>;

type PlainHandlers<Registry> = {
	[K in keyof Registry]: (
		payload: Registry[K] extends { payload: infer P } ? P : never
	) => Promise<Registry[K] extends { response: infer R } ? R : never>;
};

// For data registries, each top-level key (e.g. "QUERY_DB") fans out into a
// nested handler keyed by the message's own `dbType` discriminator, so the
// payload/response types are narrowed to that specific sub-command.
type DataHandlers<Registry> = {
	[T in keyof Registry]: Registry[T] extends {
		dbType: string;
		payload: any;
		response: any;
	}
		? {
				[K in Registry[T]['dbType']]: (
					payload: Extract<Registry[T], { dbType: K }>['payload']
				) => Promise<Extract<Registry[T], { dbType: K }>['response']>;
			}
		: never;
};

type OffscreenHandlers = PlainHandlers<OffscreenMessageRegistry> &
	Partial<DataHandlers<OffscreenDataMessageRegistry>>;

type WorkerHandlers = PlainHandlers<WorkerMessageRegistry> &
	Partial<DataHandlers<WorkerDataMessageRegistry>>;

export function createOffscreenListener(handlers: Partial<OffscreenHandlers>) {
	return createGenericListener(handlers, MessageTargets.OFFSCREEN);
}

export function createWorkerListener(handlers: Partial<WorkerHandlers>) {
	return createGenericListener(handlers, MessageTargets.WORKER);
}

function createGenericListener(handlers: GenericHandlers, target: MessageTargets) {
	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (message.target !== target) {
			return false;
		}

		const entry = handlers[message.type as MessageType];
		const handler = typeof entry === 'function' ? entry : entry?.[message.dbType];

		if (handler) {
			// Execute the handler and pipe the result back to the sender
			handler(message.payload)
				.then((response) => sendResponse(response))
				.catch((error) => {
					console.error(`Error in handler [${message.type}]:`, error);
					sendResponse({ error: String(error) });
				});

			return true; // Required by Chrome to indicate an asynchronous response
		}

		return false;
	});
}
