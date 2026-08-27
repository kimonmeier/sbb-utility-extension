import {
  MessageTargets,
  type OffscreenDataMessageRegistry,
  type OffscreenMessageRegistry,
  type UIMessageRegistry,
  type WorkerDataMessageRegistry,
  type WorkerMessageRegistry,
} from "./messages";

export async function sendOffscreenDataMessage<
  T extends keyof OffscreenDataMessageRegistry,
  K extends OffscreenDataMessageRegistry[T]["dbType"],
>(
  type: T,
  dbType: K,
  ...args: Extract<OffscreenDataMessageRegistry[T], { dbType: K }>["payload"] extends undefined
    ? []
    : [payload: Extract<OffscreenDataMessageRegistry[T], { dbType: K }>["payload"]]
): Promise<Extract<OffscreenDataMessageRegistry[T], { dbType: K }>["response"]> {
  const payload = args[0];

  return await chrome.runtime.sendMessage({
    target: MessageTargets.OFFSCREEN,
    type,
    dbType,
    payload,
  });
}

export async function sendOffscreenMessage<T extends keyof OffscreenMessageRegistry>(
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

export async function sendWorkerDataMessage<
  T extends keyof WorkerDataMessageRegistry,
  K extends WorkerDataMessageRegistry[T]["dbType"],
>(
  type: T,
  dbType: K,
  ...args: Extract<WorkerDataMessageRegistry[T], { dbType: K }>["payload"] extends undefined
    ? []
    : [payload: Extract<WorkerDataMessageRegistry[T], { dbType: K }>["payload"]]
): Promise<Extract<WorkerDataMessageRegistry[T], { dbType: K }>["response"]> {
  const payload = args[0];

  return await chrome.runtime.sendMessage({
    target: MessageTargets.WORKER,
    type,
    dbType,
    payload,
  });
}

export async function sendWorkerMessage<T extends keyof WorkerMessageRegistry>(
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

export async function sendUIMessage<T extends keyof UIMessageRegistry>(
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
