import { createHandlerManager, type HandlerDescriptor } from './handlerManager';
import { loadRuntimePluginDescriptors } from './runtimePlugins';

// Aggregate descriptors from all plugins automatically via import.meta.glob
export function createGlobalHandlersManager() {
  // Synchronously collect built-in plugins from source tree
  const builtInModules = import.meta.glob('../../plugins/**/index.ts', { eager: true }) as Record<string, any>;
  const builtInDescriptors: HandlerDescriptor[] = [];
  for (const [path, mod] of Object.entries(builtInModules)) {
    try {
      let collected: any = null;
      if (typeof mod?.default === 'function') collected = mod.default();
      else if (typeof mod?.pluginHandlers === 'function') collected = mod.pluginHandlers();
      else {
        for (const key of Object.keys(mod)) {
          const fn = mod[key];
          if (typeof fn === 'function' && key.endsWith('PluginHandlers')) { collected = fn(); break; }
        }
      }
      if (Array.isArray(collected)) builtInDescriptors.push(...(collected as HandlerDescriptor[]));
      else if (collected) console.warn(`[handlers] 插件 ${path} 导出形式异常，已忽略`);
    } catch (err) {
      console.warn(`[handlers] 载入插件失败: ${path}`, err);
    }
  }

  // Manager for built-in plugins
  const builtInManager = createHandlerManager(builtInDescriptors);

  // Lazy runtime manager placeholder
  let runtimeManager: ReturnType<typeof createHandlerManager> | null = null;

  return {
    async start() {
      await builtInManager.start();
      // Load runtime plugins from app data folder and start another manager
      try {
        const runtimeDescriptors = await loadRuntimePluginDescriptors();
        if (runtimeDescriptors.length > 0) {
          runtimeManager = createHandlerManager(runtimeDescriptors);
          await runtimeManager.start();
          console.log(`[handlers] runtime plugins started: ${runtimeDescriptors.length} handlers`);
        } else {
          console.log('[handlers] no runtime plugins found');
        }
      } catch (err) {
        console.warn('[handlers] failed starting runtime plugins:', err);
      }
    },
    stop() {
      builtInManager.stop();
      runtimeManager?.stop();
      runtimeManager = null;
    },
  };
}
