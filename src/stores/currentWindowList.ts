import { defineStore } from 'pinia'
import { ScreenshotableWindow } from 'tauri-plugin-screenshots-api'

interface State {
  list: ScreenshotableWindow[]
}

export const useCurrentWindowListStore = defineStore('currentWindowList', {
  state: (): State => ({
    list: [],
  }),
  actions: {
    /**
     * Replace the list with a new, complete array of windows.
     * We use splice to preserve the original array reference so
     * any watchers/subscriptions on the array itself continue to fire.
     */
    update(newList: ScreenshotableWindow[]) {
      const added = newList.filter(item => !this.list.some(existing => existing.id === item.id))
      this.list.splice(0, this.list.length, ...newList)
      return added
    },

    /** Clear all items */
    clear() {
      this.list.splice(0)
    },
  },
})
