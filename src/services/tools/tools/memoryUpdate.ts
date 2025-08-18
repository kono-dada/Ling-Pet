import type { Tool } from '../types'
import { useMemoryStore } from '../../../stores/memory'

export const memoryUpdateTool: Tool = {
  name: 'memoryUpdate',
  description:
    '参数：id（记忆ID）, content（新内容；为空字符串则删除）\n' +
    '  功能：使用 id 更新一条记忆；当 content 为 "" 时删除该记忆。\n' +
    '  例子（更新）：memoryUpdate("lxt8l3bq-2k9p1u5q", "用户常在晚上学习")\n' +
    '  例子（删除）：memoryUpdate("lxt8l3bq-2k9p1u5q", "")',
  async call(id?: string, content?: string) {
    const store = useMemoryStore()
    store.updateMemory(id ?? '', content ?? '')
    return { id, deleted: (content ?? '') === '' }
  },
}
