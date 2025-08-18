import { defineStore } from 'pinia'
import { AIMessage } from '../types/ai';

const exampleChatHistory: AIMessage[] = []

export const useChatHistoryStore = defineStore('chatHistory', {
  state: () => ({
    chatHistory: exampleChatHistory,
  }),
  actions: {
    addMessage(message: AIMessage) {
      this.chatHistory.push(message);
    },
    clear() {
      this.chatHistory = [];
    },
    deleteMessageAndAfter(index: number) {
      this.chatHistory = this.chatHistory.slice(0, index);
    }
  },
  tauri: {
    saveOnChange: true,

    // You can also debounce or throttle when saving.
    // This is optional. The default behavior is to save immediately.
    saveStrategy: 'debounce',
    saveInterval: 500,
  },
});