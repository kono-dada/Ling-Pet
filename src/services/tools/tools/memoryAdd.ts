import type { Tool } from '../types'
import { useMemoryStore } from '../../../stores/memory'

export const memoryAddTool: Tool = {
  name: 'memoryAdd',
  description:
    '参数：content（记忆内容，字符串）\n' +
    '  功能：新增一条记忆，自动分配随机 id，返回该 id。\n' +
    '  例子：memoryAdd("用户喜欢喝冰美式")',
  async call(content?: string) {
    const store = useMemoryStore()
    const id = store.addMemory(content ?? '')
    return { id }
  },
}
