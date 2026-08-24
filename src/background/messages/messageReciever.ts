import {
  MessageTargets,
  type MessageRegistry,
  type MessageType,
  type OffscreenMessageRegistry,
  type WorkerMessageRegistry,
} from "./messages";

// Defines an object where the keys are MessageTypes and the values are functions
// that take the correct payload and return the correct Promise response.
type GenericHandlers = {
  [K in MessageType]: (
    payload: MessageRegistry[K]["payload"],
  ) => Promise<MessageRegistry[K]["response"]>;
};

type OffscreenHandlers = {
  [K in MessageType]: (
    payload: OffscreenMessageRegistry[K]["payload"],
  ) => Promise<OffscreenMessageRegistry[K]["response"]>;
};

type WorkerHandlers = {
  [K in MessageType]: (
    payload: WorkerMessageRegistry[K]["payload"],
  ) => Promise<WorkerMessageRegistry[K]["response"]>;
};

export function createOffscreenListener(handlers: Partial<OffscreenHandlers>) {
  return createGenericListener(handlers, MessageTargets.OFFSCREEN);
}

export function createWorkerListener(handlers: Partial<WorkerHandlers>) {
  return createGenericListener(handlers, MessageTargets.WORKER);
}

function createGenericListener(
  handlers: Partial<GenericHandlers>,
  target: MessageTargets,
) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target !== target) {
      return false;
    }

    const handler = handlers[message.type as MessageType];

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
