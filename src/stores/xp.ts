import { defineStore } from 'pinia'

export const useXPStore = defineStore('xp', {
  state: () => ({
    story: [] as string[],
    sexPos: [] as string[],
  }),
  actions: {
    addStory(story: string) {
      this.story.push(story);
    },
    addSexPos(sexPos: string) {
      this.sexPos.push(sexPos);
    },
  },
});