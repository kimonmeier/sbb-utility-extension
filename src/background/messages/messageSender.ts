import {
  MessageTargets,
  type MessageRegistry,
  type MessageType,
  type OffscreenMessageRegistry,
  type UIMessageRegistry,
  type WorkerMessageRegistry,
} from "./messages";

export async function sendOffscreenMessage<T extends MessageType>(
  type: T,
  ...args: OffscreenMessageRegistry[T]["payload"] extends undefined
    ? []
    : [payload: OffscreenMessageRegistry[T]["payload"]]
): Promise<OffscreenMessageRegistry[T]["response"]> {
  const payload = args[0];

  return await chrome.runtime.sendMessage({
    target: MessageTargets.OFFSCREEN,
    type,
    payload,
  });
}

export async function sendWorkerMessage<T extends MessageType>(
  type: T,
  ...args: WorkerMessageRegistry[T]["payload"] extends undefined
    ? []
    : [payload: WorkerMessageRegistry[T]["payload"]]
): Promise<WorkerMessageRegistry[T]["response"]> {
  const payload = args[0];

  return await chrome.runtime.sendMessage({
    target: MessageTargets.WORKER,
    type,
    payload,
  });
}

export async function sendUIMessage<T extends MessageType>(
  type: T,
  ...args: UIMessageRegistry[T]["payload"] extends undefined
    ? []
    : [payload: UIMessageRegistry[T]["payload"]]
): Promise<UIMessageRegistry[T]["response"]> {
  const payload = args[0];

  return await chrome.runtime.sendMessage({
    target: MessageTargets.UI,
    type,
    payload,
  });
}
