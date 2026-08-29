import type { QueryMessage, PostCommandMessage, DeleteCommandMessage } from './db';

export type WorkerMessageRegistry = {
	SYNC_API_WORKER: {
		payload: undefined;
		response: { success: boolean; error?: string };
	};
	RESET_DB: {
		payload: undefined;
		response: { success: boolean; error?: string };
	};
	EXPORT_DB_SQLITE: {
		payload: undefined;
		response: { success: boolean; fileBase64?: string; error?: string };
	};
	IMPORT_DB_SQLITE: {
		payload: { fileBase64: string };
		response: { success: boolean; error?: string };
	};
	EXPORT_DB_JSON: {
		payload: undefined;
		response: { success: boolean; json?: string; error?: string };
	};
	IMPORT_DB_JSON: {
		payload: { json: string };
		response: { success: boolean; error?: string };
	};
};

export type WorkerDataMessageRegistry = {
	QUERY_DB: QueryMessage;
	INSERT_DB: PostCommandMessage;
	DELETE_DB: DeleteCommandMessage;
};

export type WorkerUnionMessageRegistry = WorkerMessageRegistry & WorkerDataMessageRegistry;
