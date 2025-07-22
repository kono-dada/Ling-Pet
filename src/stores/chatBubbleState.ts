import { defineStore } from 'pinia'

export const useChatBubbleStateStore = defineStore('chatBubbleState', {
  state: () => ({
    currentMessage: '',
    // 其他状态...
  }),
  actions: {
    setCurrentMessage(message: string) {
      this.currentMessage = message;
    },
  },
});