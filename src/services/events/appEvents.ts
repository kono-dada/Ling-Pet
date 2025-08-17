import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { ScreenshotableWindow } from 'tauri-plugin-screenshots-api';

// Centralized event names for cross-window/frontend-backend usage
export const AppEvents = {
  WINDOWS_UPDATED: 'WINDOWS_UPDATED',
  NEW_WINDOWS: 'NEW_WINDOWS',
  AVATAR_MULTI_CLICK: 'AVATAR_MULTI_CLICK',
  NO_INTERACTION_TIMEOUT: 'NO_INTERACTION_TIMEOUT',
} as const;

export interface EventPayloadMap {
  WINDOWS_UPDATED: ScreenshotableWindow[];
  NEW_WINDOWS: ScreenshotableWindow[];
  AVATAR_MULTI_CLICK: { ts: number; threshold: number; windowMs: number };
  NO_INTERACTION_TIMEOUT: { ts: number; sinceMs: number; thresholdMs: number };
}

export type AppEventName = keyof EventPayloadMap;

export async function emitEvent<E extends AppEventName>(event: E, payload: EventPayloadMap[E]): Promise<void> {
  await emit(event, payload);
}

type ListenOptions = {
  // If true, drop incoming events while a previous handler invocation is running.
  blocking?: boolean;
};

const runningMap = new Map<AppEventName, boolean>();

export async function listenEvent<E extends AppEventName>(
  event: E,
  handler: (payload: EventPayloadMap[E]) => void | Promise<void>,
  options: ListenOptions = {},
): Promise<UnlistenFn> {
  const { blocking = false } = options;
  if (!blocking) {
    return listen<EventPayloadMap[E]>(event, (e) => handler(e.payload as EventPayloadMap[E]));
  }

  runningMap.set(event, false);
  return listen<EventPayloadMap[E]>(event, async (e) => {
    const running = runningMap.get(event) === true;
    if (running) {
      // Drop new events while handler is running
      console.warn(`[events] dropping event ${event} while handler is running`);
      return;
    }
    runningMap.set(event, true);
    try {
      await handler(e.payload as EventPayloadMap[E]);
    } catch (err) {
      console.warn(`[events] handler error for ${event}:`, err);
    } finally {
      runningMap.set(event, false);
    }
  });
}
