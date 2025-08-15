import { invoke } from '@tauri-apps/api/core'
import { voiceVits } from './vitsService'
import { debug } from '@tauri-apps/plugin-log';
import { useVitsConfigStore } from '../../stores/vitsConfig';

// Rust 侧统一管理子进程，保证多窗口/多 webview 全局唯一

export async function startSbv2(installPath: string) { // 防止重复启动（内存 + 探活）
  const vc = useVitsConfigStore();
  debug('准备启动sbv2')
  vc.baseURL = 'http://localhost:23456'
  try {
    // 如果已经可用则直接返回
    await probeSbv2()
    debug('sbv2_api 已在运行，跳过启动');
    return true
  } catch (error) {
    debug('sbv2_api 探活失败，准备启动');
  }
  if (!installPath) throw new Error('缺少安装路径');
  await invoke('sbv2_start', { installPath });
  debug('sbv2_start 已调用');
  return true
}

export async function stopSbv2(): Promise<void> {
  await invoke('sbv2_stop');
}

export async function sbv2Status(): Promise<{ running: boolean; pid?: number | null }>{
  return await invoke('sbv2_status');
}

// 探活（用于跨窗口判断是否已在运行）
export async function probeSbv2(): Promise<void> {
  await voiceVits("テスト");
  debug('sbv2_api 探活成功');
}

