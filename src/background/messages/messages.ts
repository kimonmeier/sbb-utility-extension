// Define the exact shape of every message in your app
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

export type WorkerMessageRegistry = {
  SYNC_API_WORKER: {
    payload: undefined;
    response: { success: boolean; error?: string };
  };
};

export type UIMessageRegistry = {
  // Define UI messages here if needed
};

export type MessageRegistry = OffscreenMessageRegistry &
  WorkerMessageRegistry &
  UIMessageRegistry;

export enum MessageTargets {
  OFFSCREEN = "offscreen",
  WORKER = "worker",
  UI = "ui",
}

export type MessageType = keyof MessageRegistry;
