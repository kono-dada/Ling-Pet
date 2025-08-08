import { Command } from '@tauri-apps/plugin-shell'
import { voiceVits } from './vitsService'
import { debug } from '@tauri-apps/plugin-log';
import { useVitsConfigStore } from '../stores/vitsConfig';
import { platform } from '@tauri-apps/plugin-os';
import { Child } from '@tauri-apps/plugin-shell';
import { path } from '@tauri-apps/api';

let child: Child | null = null;

export async function startSbv2(installPath: string) {// 防止重复启动（内存 + 探活）
  const vc = useVitsConfigStore();
  debug('准备启动sbv2')
  vc.baseURL = 'http://localhost:23456'
  try {
    if (!child) {
      await probeSbv2()
    }
    debug('sbv2_api 已在运行，跳过启动');
    return true
  } catch (error) {
    debug('sbv2_api 探活失败，准备启动');
  }
  if (!installPath) throw new Error('缺少安装路径');
  const os = await platform();
  const name = os === 'windows' ? 'sbv2-win' : 'sbv2-nix';
  const command = Command.create(name, [], {
    cwd: await path.normalize(installPath),                 // 关键：动态目录
    env: { 
      RUST_LOG: 'info',
      BERT_MODEL_PATH: 'deberta.onnx',
      MODELS_PATH: '.',
      TOKENIZER_PATH: 'tokenizer.json',
      ADDR: 'localhost:23456',
      HOLDER_MAX_LOADED_MODELS: '20',
      AGPL_DICT_PATH: 'all.bin'
    },
  });
  console.log(`sbv2_api 启动命令`, command);
  child = await command.spawn(); // 直接就是 sbv2_api 本体的进程
  debug(`sbv2 pid: ${child.pid}`);
  return true
}

// 探活（用于跨窗口判断是否已在运行）
export async function probeSbv2(): Promise<void> {
  await voiceVits("テスト");
  debug('sbv2_api 探活成功');
}

