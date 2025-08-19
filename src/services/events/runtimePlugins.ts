import { readDir, readTextFile, mkdir } from '@tauri-apps/plugin-fs';
import { BaseDirectory, join } from '@tauri-apps/api/path';
import type { HandlerDescriptor } from './handlerManager';
import { emitEvent, listenEvent } from './appEvents';
import { chatForSchedule } from '../chatAndVoice/chatForSchedule';

export type RuntimePluginModule = {
  default?: (api: RuntimePluginApi) => HandlerDescriptor[] | Promise<HandlerDescriptor[]>;
  pluginHandlers?: (api: RuntimePluginApi) => HandlerDescriptor[] | Promise<HandlerDescriptor[]>;
  [k: string]: any;
};

export type RuntimePluginApi = {
  events: {
    emitEvent: typeof emitEvent;
    listenEvent: typeof listenEvent;
  };
  chat: {
    chatForSchedule: typeof chatForSchedule;
  };
};

const BASE_DIR = BaseDirectory.AppData;
const RELATIVE_DIR = 'plugins';
async function ensurePluginsDir(): Promise<string> {
  try {
    await mkdir(RELATIVE_DIR, { recursive: true, baseDir: BASE_DIR });
  } catch (_) {}
  return RELATIVE_DIR;
}

async function listJsModules(dir: string): Promise<string[]> {
  const entries = await readDir(dir, { baseDir: BASE_DIR }).catch(() => []);
  const files: string[] = [];
  for (const e of entries) {
    if (e.isFile && e.name && (e.name.endsWith('.mjs') || e.name.endsWith('.js'))) {
      files.push(e.name);
    }
  }
  return files;
}

async function importFromCode(code: string): Promise<RuntimePluginModule | null> {
  try {
    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const mod = (await import(/* @vite-ignore */ url)) as RuntimePluginModule;
    URL.revokeObjectURL(url);
    return mod;
  } catch (err) {
    console.warn('[runtime-plugins] dynamic import failed', err);
    return null;
  }
}

export async function loadRuntimePluginDescriptors(): Promise<HandlerDescriptor[]> {
  const api: RuntimePluginApi = {
    events: { emitEvent, listenEvent },
    chat: { chatForSchedule },
  };
  const result: HandlerDescriptor[] = [];
  try {
    await ensurePluginsDir();
    const files = await listJsModules(RELATIVE_DIR);
    for (const name of files) {
      try {
        const filePath = await join(RELATIVE_DIR, name);
        const code = await readTextFile(filePath, { baseDir: BASE_DIR } as any);
        const mod = await importFromCode(code);
        if (!mod) continue;
        let descriptors: any = null;
        if (typeof mod.default === 'function') descriptors = await mod.default(api);
        else if (typeof mod.pluginHandlers === 'function') descriptors = await mod.pluginHandlers(api);
        else {
          for (const key of Object.keys(mod)) {
            const fn = (mod as any)[key];
            if (typeof fn === 'function' && key.endsWith('PluginHandlers')) {
              descriptors = await fn(api);
              break;
            }
          }
        }
        if (Array.isArray(descriptors)) {
          result.push(...descriptors as HandlerDescriptor[]);
          console.log(`[runtime-plugins] loaded ${name} with ${descriptors.length} handlers`);
        } else if (descriptors) {
          console.warn(`[runtime-plugins] ${name} returned invalid handlers, ignored`);
        }
      } catch (err) {
        console.warn(`[runtime-plugins] failed to load ${name}:`, err);
      }
    }
  } catch (err) {
    console.warn('[runtime-plugins] scan failed:', err);
  }
  return result;
}
