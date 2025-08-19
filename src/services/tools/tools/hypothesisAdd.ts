import type { Tool } from '../types'
import { useHypothesesStore } from '../../../stores/hypotheses'
import type { ExecToolResult } from '../types'

export const hypothesisAddTool: Tool = {
  name: 'hypothesisAdd',
  description:
    '参数：content（推测内容，字符串）\n' +
    '  功能：新增一条“推测”，自动分配随机 id。当你对用户的一些判断并不一定准确时，你可以加在这里。如果用户对你有什么要求，你也可以记在这里。\n' +
    '  例子：hypothesisAdd("用户最近可能在准备考试")',
  async call(content?: string): Promise<ExecToolResult> {
    const store = useHypothesesStore()
    const id = store.addHypothesis(content ?? '')
    return { ok: true, continue: false, result: JSON.stringify({ id }) }
  },
}
