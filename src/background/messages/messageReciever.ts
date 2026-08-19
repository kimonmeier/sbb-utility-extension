import {
  MessageTargets,
  type MessageRegistry,
  type MessageType,
} from "./messages";

// Defines an object where the keys are MessageTypes and the values are functions
// that take the correct payload and return the correct Promise response.
type OffscreenHandlers = {
  [K in MessageType]: (
    payload: MessageRegistry[K]["payload"],
  ) => Promise<MessageRegistry[K]["response"]>;
};

export function createOffscreenListener(handlers: Partial<OffscreenHandlers>) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target !== MessageTargets.OFFSCREEN) {
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
