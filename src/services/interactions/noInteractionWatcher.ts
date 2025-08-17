import { usePetStateStore } from '../../stores/petState'
import { emitNoInteractionTimeout } from '../events/emitters'

// Emits NO_INTERACTION_TIMEOUT when no avatar interaction occurs for a while.
// Note: This watches petState.lastClickTimestamp only (pure user interaction).

const CHECK_INTERVAL_MS = 1000
const DEFAULT_THRESHOLD_MS = 60_000 // 1 minute of no interaction

let timerId: number | null = null
let thresholdMs = DEFAULT_THRESHOLD_MS

export function startNoInteractionWatcher(options?: { thresholdMs?: number }) {
  if (timerId !== null) return
  thresholdMs = options?.thresholdMs ?? DEFAULT_THRESHOLD_MS
  const pet = usePetStateStore()

  timerId = window.setInterval(() => {
    try {
      const now = Date.now()
      const sinceMs = now - pet.lastClickTimestamp
      if (sinceMs >= thresholdMs) {
        void emitNoInteractionTimeout({ ts: now, sinceMs, thresholdMs })
        // Reset the no-interaction timer as requested
        pet.updateLastClickTimestamp()
        console.log('[inactivity] no interaction timeout emitted')
      }
    } catch (err) {
      console.warn('[inactivity] check failed:', err)
    }
  }, CHECK_INTERVAL_MS)
}

export function stopNoInteractionWatcher() {
  if (timerId !== null) {
    clearInterval(timerId)
    timerId = null
  }
}

