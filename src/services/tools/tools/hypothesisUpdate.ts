import type { Tool } from '../types'
import { useHypothesesStore } from '../../../stores/hypotheses'
import type { ExecToolResult } from '../types'

export const hypothesisUpdateTool: Tool = {
  name: 'hypothesisUpdate',
  description:
    '参数：id（推测ID）, content（新内容；为空字符串则删除）\n' +
    '功能：使用 id 更新一条“推测”；当 content 为 "" 时删除该条。注意：推测仅代表灵灵的主观判断，不保证正确。\n' +
    '例子（更新）：hypothesisUpdate("lxt8m2y3-8n1g6k2r", "用户也许更喜欢深色主题")\n' +
    '例子（删除）：hypothesisUpdate("lxt8m2y3-8n1g6k2r", "")',
  async call(id?: string, content?: string): Promise<ExecToolResult> {
    const store = useHypothesesStore()
    store.updateHypothesis(id ?? '', content ?? '')
    return { ok: true, continue: false, result: { id, deleted: (content ?? '') === '' } }
  },
}
