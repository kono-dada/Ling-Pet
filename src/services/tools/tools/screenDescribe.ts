import type { Tool } from '../types'
import type { ExecToolResult } from '../types'
import { describeScreens } from '../../screenAnalysis/screenDescription'

// 工具：获取当前可截图窗口（或指定单个窗口ID）的视觉描述
// 参数：windowId（可选，单个数字ID；为空表示自动检测多个窗口）
export const screenDescribeTool: Tool = {
  name: 'screenDescribe',
  description:
    '参数：windowId（必选）\n' +
    '  功能：对指定或当前可截图窗口进行视觉描述，返回文本结果。如果你想查看某个窗口，就需要调用这个工具',
  async call(idRaw?: string): Promise<ExecToolResult> {
    try {
      let target: number[] | null = null
      const raw = (idRaw ?? '').trim()
      if (raw.length > 0) {
        const n = Number(raw)
        if (!Number.isFinite(n)) {
          return { ok: false, continue: true, result: 'invalid windowId', error: 'invalid windowId' }
        }
        target = [n]
      }

      const result = await describeScreens(target)
      // 统一字符串返回
      return { ok: true, continue: true, result }
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : String(e)
      return { ok: false, continue: true, result: 'screenDescribe failed', error: msg }
    }
  }
}
