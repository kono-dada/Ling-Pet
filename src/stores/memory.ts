import { defineStore } from 'pinia'

export interface MemoryState {
  /** memoryId -> memoryContent */
  memories: Record<string, string>
}

function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const useMemoryStore = defineStore('memory', {
  state: (): MemoryState => ({
    memories: {},
  }),
  actions: {
    // 1) 读取所有记忆：返回 JSON 字符串
    getAllAsJSON(): string {
      return JSON.stringify(this.memories)
    },

    // 2) 添加记忆：自动分配随机 id，返回该 id
    addMemory(content: string): string {
      const id = genId()
      this.memories[id] = content
      return id
    },

    // 3) 更新记忆：使用 id 更新，若 content 为空字符串则删除该记忆
    updateMemory(id: string, content: string): void {
      if (!id) return
      if (content === '') delete this.memories[id]
      else this.memories[id] = content
    },
  },
  tauri: {
    saveOnChange: true,
    saveStrategy: 'debounce',
    saveInterval: 400,
  },
})
