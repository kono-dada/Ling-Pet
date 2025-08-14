import { createHandlerManager, type HandlerDescriptor } from './handlerManager';
import { AppEvents } from './appEvents';
import { useScreenAnalysisConfigStore } from '../../stores/screenAnalysisConfig';
import { handleNewWindows } from '../screenAnalysis/onNewWindows';

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
    // Future: push more descriptors from other plugins here
  ];

  return createHandlerManager(descriptors);
}

