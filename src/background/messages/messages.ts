// Define the exact shape of every message in your app
export type MessageRegistry = {
  INIT_DB: {
    payload: undefined;
    response: { success: boolean; error?: string };
  };
};

export enum MessageTargets {
  OFFSCREEN = "offscreen",
}

export type MessageType = keyof MessageRegistry;
