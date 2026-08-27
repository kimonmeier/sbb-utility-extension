import type { QueryMessage, PostCommandMessage, DeleteCommandMessage } from "./db";

export type OffscreenMessageRegistry = {
  INIT_DB: {
    payload: undefined;
    response: { success: boolean; error?: string };
  };
  SYNC_API: {
    payload: { api_token: string };
    response: { success: boolean; error?: string };
  };
};

export type OffscreenDataMessageRegistry = {
  QUERY_DB: QueryMessage;
  INSERT_DB: PostCommandMessage;
  DELETE_DB: DeleteCommandMessage;
};

export type OffscreenUnionMessageRegistry = OffscreenMessageRegistry & OffscreenDataMessageRegistry;
