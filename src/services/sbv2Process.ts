import { Command } from '@tauri-apps/plugin-shell'
import { voiceVits } from './vitsService'
import { debug } from '@tauri-apps/plugin-log';
import { useVitsConfigStore } from '../stores/vitsConfig';

export async function startSbv2(installPath: string) {// 防止重复启动（内存 + 探活）
const vc = useVitsConfigStore();
  debug('准备启动sbv2')
  vc.baseURL = 'http://localhost:23456'
  try {
    await probeSbv2()
    debug('sbv2_api 已在运行，跳过启动');
    return true
  } catch (error) {
    debug('sbv2_api 探活失败，准备启动');
  }
  if (!installPath) throw new Error('缺少安装路径')

  // 组装不同平台命令
  const isWindows = navigator.userAgent.includes('Windows')
  const exe = isWindows ? 'sbv2_api.exe' : 'sbv2_api'
  const exePath = `${installPath.replace(/[\\/]+$/, '')}/${exe}`

  // 使用 shell 插件，统一处理 stdout/stderr、退出事件
  let command: any
  if (isWindows) {
    // cmd /C "<exePath>"
    command = Command.create('exec-cmd', ['/C', `"${exePath}"`], {
      cwd: installPath,
      env: { RUST_LOG: 'info' },
    } as any)
  } else {
    // sh -c 'exec "/path/sbv2_api"' 确保 shell 被替换，便于 kill
    command = Command.create('exec-sh', ['-c', `exec "${exePath}"`], {
      cwd: installPath,
      env: { RUST_LOG: 'info' },
    } as any)
  }
  await command.spawn()
  debug(`sbv2_api 启动命令：${command}`)
  return true
}

// 探活（用于跨窗口判断是否已在运行）
export async function probeSbv2(): Promise<void> {
  await voiceVits("テスト");
  debug('sbv2_api 探活成功');
}

