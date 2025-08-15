import { Command } from '@tauri-apps/plugin-shell'
import { type as osType } from '@tauri-apps/plugin-os'

/**
 * 使用系统原生命令解压 zip 文件到指定目录。
 * - windows: PowerShell Expand-Archive
 * - macos/linux: unzip（失败时回退 tar -xf）
 */
export async function extractZipFile(zipPath: string, destDir: string): Promise<void> {
  const os = osType()
  if (os === 'windows') {
    await Command.create('powershell', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `Expand-Archive -LiteralPath "${zipPath}" -DestinationPath "${destDir}" -Force`
    ]).execute()
    return
  }

  // macOS / Linux / 其他：优先 unzip，失败回退 tar
  try {
    await Command.create('unzip', ['-o', zipPath, '-d', destDir]).execute()
  } catch (_) {
    await Command.create('tar', ['-xf', zipPath, '-C', destDir]).execute()
  }
}
