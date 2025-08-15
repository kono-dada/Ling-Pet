import { createHandlerManager } from './handlerManager';
import { screenAnalysisPluginHandlers } from '../../plugins/screenAnalysis';
import { interactionPluginHandlers } from '../../plugins/interactions';

// Aggregate descriptors from multiple feature areas (plugins)
export function createGlobalHandlersManager() {
  const descriptors = [
    ...screenAnalysisPluginHandlers(),
    ...interactionPluginHandlers(),
  ];

  return createHandlerManager(descriptors);
}
