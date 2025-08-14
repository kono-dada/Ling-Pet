import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event';

// Centralized event names for cross-window/frontend-backend usage
export const AppEvents = {
  WINDOWS_UPDATED: 'WINDOWS_UPDATED',
  NEW_WINDOWS: 'NEW_WINDOWS',
  AVATAR_MULTI_CLICK: 'AVATAR_MULTI_CLICK',
} as const;

export type AppEventName = typeof AppEvents[keyof typeof AppEvents];

export async function emitEvent<T = unknown>(event: AppEventName, payload: T): Promise<void> {
  await emit(event, payload);
}

type ListenOptions = {
  // If true, drop incoming events while a previous handler invocation is running.
  blocking?: boolean;
};

const runningMap = new Map<AppEventName, boolean>();

export async function listenEvent<T = unknown>(
  event: AppEventName,
  handler: (payload: T) => void | Promise<void>,
  options: ListenOptions = {},
): Promise<UnlistenFn> {
  const { blocking = false } = options;
  if (!blocking) {
    return listen<T>(event, (e) => handler(e.payload as T));
  }

  runningMap.set(event, false);
  return listen<T>(event, async (e) => {
    const running = runningMap.get(event) === true;
    if (running) {
      // Drop new events while handler is running
      console.warn(`[events] dropping event ${event} while handler is running`);
      return;
    }
    runningMap.set(event, true);
    try {
      await handler(e.payload as T);
    } catch (err) {
      console.warn(`[events] handler error for ${event}:`, err);
    } finally {
      runningMap.set(event, false);
    }
  });
}
