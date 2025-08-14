import { emitEvent, AppEvents } from '../events/appEvents';

// Emits AVATAR_MULTI_CLICK when user clicks the avatar rapidly N times in a time window.
// Defaults: 3 clicks within 1200ms.

const WINDOW_MS = 1200;
const THRESHOLD = 3;

let clicks: number[] = []; // timestamps

export function registerAvatarClick(): void {
  const now = Date.now();
  // keep only recent timestamps
  clicks = clicks.filter((t) => now - t <= WINDOW_MS);
  clicks.push(now);
  if (clicks.length >= THRESHOLD) {
    // reset to avoid repeated firing on every subsequent click in the window
    clicks = [];
    void emitEvent(AppEvents.AVATAR_MULTI_CLICK, { ts: now, threshold: THRESHOLD, windowMs: WINDOW_MS });
    console.log(`[avatar] 多次点击事件触发: ${THRESHOLD} 次点击在 ${WINDOW_MS}ms 内`);
  }
}

