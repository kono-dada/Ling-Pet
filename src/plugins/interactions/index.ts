import { type HandlerDescriptor } from '../../services/events/handlerManager';
import { handleAvatarMultiClick } from './onAvatarMultiClick';

export function interactionPluginHandlers(): HandlerDescriptor[] {
  const d1 = {
    key: 'interaction:avatar-multi-click-demo',
    event: 'AVATAR_MULTI_CLICK',
    blocking: true,
    isEnabled: () => true, // can wire to a store setting later
    handle: handleAvatarMultiClick,
  } as HandlerDescriptor<'AVATAR_MULTI_CLICK'>;

  return [d1 as HandlerDescriptor];
}
