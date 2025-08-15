import { emitEvent } from './appEvents';
import type { EventPayloadMap } from './appEvents';

// Centralized emitters for all app events. Use these instead of emitEvent directly.

export function emitNewWindows(payload: EventPayloadMap['NEW_WINDOWS']) {
  return emitEvent('NEW_WINDOWS', payload);
}

export function emitAvatarMultiClick(payload: EventPayloadMap['AVATAR_MULTI_CLICK']) {
  return emitEvent('AVATAR_MULTI_CLICK', payload);
}

