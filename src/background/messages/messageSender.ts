import type { MessageRegistry, MessageType } from "./messages";

export async function sendOffscreenMessage<T extends MessageType>(
  type: T,
  ...args: MessageRegistry[T]["payload"] extends undefined
    ? []
    : [payload: MessageRegistry[T]["payload"]]
): Promise<MessageRegistry[T]["response"]> {
  const payload = args[0];

  return await chrome.runtime.sendMessage({
    target: "offscreen",
    type,
    payload,
  });
}
