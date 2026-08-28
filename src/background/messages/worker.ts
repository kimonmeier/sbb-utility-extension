import type { QueryMessage, PostCommandMessage, DeleteCommandMessage } from './db';

export type WorkerMessageRegistry = {
	SYNC_API_WORKER: {
		payload: undefined;
		response: { success: boolean; error?: string };
	};
};

export type WorkerDataMessageRegistry = {
	QUERY_DB: QueryMessage;
	INSERT_DB: PostCommandMessage;
	DELETE_DB: DeleteCommandMessage;
};

export type WorkerUnionMessageRegistry = WorkerMessageRegistry & WorkerDataMessageRegistry;
