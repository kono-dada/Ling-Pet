import { defineStore } from 'pinia'

export interface HypothesesState {
  /** hypothesisId -> hypothesisContent */
  hypotheses: Record<string, string>
}

function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const useHypothesesStore = defineStore('hypotheses', {
  state: (): HypothesesState => ({
    hypotheses: {},
  }),
  actions: {
    // 1) 读取所有推测：返回 JSON 字符串
    getAllAsJSON(): string {
      return JSON.stringify(this.hypotheses)
    },

    // 2) 添加推测：自动分配随机 id，返回该 id
    addHypothesis(content: string): string {
      const id = genId()
      this.hypotheses[id] = content
      return id
    },

    // 3) 更新推测：使用 id 更新，若 content 为空字符串则删除该推测
    updateHypothesis(id: string, content: string): void {
      if (!id) return
      if (content === '') delete this.hypotheses[id]
      else this.hypotheses[id] = content
    },
  },
  tauri: {
    saveOnChange: true,
    saveStrategy: 'debounce',
    saveInterval: 400,
  },
})

