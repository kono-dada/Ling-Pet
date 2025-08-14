import { watch } from 'vue';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { listenEvent, type AppEventName } from './appEvents';

export interface HandlerDescriptor<T = unknown> {
  key: string; // unique id for this handler
  event: AppEventName;
  blocking?: boolean;
  isEnabled: () => boolean; // reactive getter from a store or computed
  handle: (payload: T) => void | Promise<void>;
}

export function createHandlerManager(descriptors: HandlerDescriptor[]) {
  const unlistenMap = new Map<string, UnlistenFn>();
  const stopWatchers: Array<() => void> = [];

  async function attach(desc: HandlerDescriptor) {
    if (unlistenMap.has(desc.key)) return;
    try {
      const off = await listenEvent(desc.event, (payload) => desc.handle(payload), {
        blocking: desc.blocking === true,
      });
      unlistenMap.set(desc.key, off);
      console.log(`[handlers] 已启动: ${desc.key} (事件=${desc.event}, 阻塞=${!!desc.blocking})`);
    } catch (err) {
      console.warn(`[handlers] 启动失败: ${desc.key}`, err);
    }
  }

  function detach(desc: HandlerDescriptor) {
    const off = unlistenMap.get(desc.key);
    if (off) {
      off();
      unlistenMap.delete(desc.key);
      console.log(`[handlers] 已停止: ${desc.key} (事件=${desc.event})`);
    }
  }

  async function start() {
    // 根据当前设置初始化
    await Promise.all(
      descriptors.map((d) => (d.isEnabled() ? attach(d) : Promise.resolve()))
    );

    // 监听开关
    descriptors.forEach((d) => {
      const stop = watch(
        () => d.isEnabled(),
        async (enabled) => {
          if (enabled) await attach(d);
          else detach(d);
        }
      );
      stopWatchers.push(stop);
    });
  }

  function stop() {
    // 移除所有监听器
    unlistenMap.forEach((off, _key) => {
      try { off(); } catch {}
    });
    unlistenMap.clear();
    // 停止所有监听
    stopWatchers.splice(0).forEach((s) => s());
  }

  return { start, stop };
}
