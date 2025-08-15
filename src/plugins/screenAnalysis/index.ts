import { type HandlerDescriptor } from '../../services/events/handlerManager';
import { handleNewWindows } from './onNewWindows';

import { useScreenAnalysisConfigStore } from '../../stores/screenAnalysisConfig';

export function screenAnalysisPluginHandlers(): HandlerDescriptor[] {
  const sac = useScreenAnalysisConfigStore();
  const d1 = {
    key: 'screen:new-windows-auto-reply',
    event: 'NEW_WINDOWS',
    blocking: true,
    isEnabled: () => sac.enableNewWindowAutoReply,
    handle: handleNewWindows,
  } as HandlerDescriptor<'NEW_WINDOWS'>;

  return [d1 as HandlerDescriptor];
}
