export type {
	OffscreenMessageRegistry,
	OffscreenDataMessageRegistry,
	OffscreenUnionMessageRegistry
} from './offscreen';
export type {
	WorkerMessageRegistry,
	WorkerDataMessageRegistry,
	WorkerUnionMessageRegistry
} from './worker';
export type { UIMessageRegistry } from './ui';

import type { OffscreenUnionMessageRegistry } from './offscreen';
import type { WorkerUnionMessageRegistry } from './worker';
import type { UIMessageRegistry } from './ui';

export type MessageRegistry = OffscreenUnionMessageRegistry &
	WorkerUnionMessageRegistry &
	UIMessageRegistry;

export enum MessageTargets {
	OFFSCREEN = 'offscreen',
	WORKER = 'worker',
	UI = 'ui'
}

export type MessageType = keyof MessageRegistry;
