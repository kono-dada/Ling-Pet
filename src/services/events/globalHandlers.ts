import { createHandlerManager, type HandlerDescriptor } from './handlerManager';
import { AppEvents } from './appEvents';
import { useScreenAnalysisConfigStore } from '../../stores/screenAnalysisConfig';
import { handleNewWindows } from '../screenAnalysis/onNewWindows';
import { handleAvatarMultiClick } from '../interactions/onAvatarMultiClick';

// Aggregate descriptors from multiple feature areas (plugins)
export function createGlobalHandlersManager() {
  const sac = useScreenAnalysisConfigStore();

  const descriptors: HandlerDescriptor[] = [
    {
      key: 'screen:new-windows-auto-reply',
      event: AppEvents.NEW_WINDOWS,
      blocking: true,
      isEnabled: () => sac.enableNewWindowAutoReply,
      handle: handleNewWindows as any,
    },
    {
      key: 'interaction:avatar-multi-click-demo',
      event: AppEvents.AVATAR_MULTI_CLICK,
      blocking: true,
      isEnabled: () => true, // always on for demo; can add a toggle later
      handle: handleAvatarMultiClick as any,
    },
  ];

  return createHandlerManager(descriptors);
}
