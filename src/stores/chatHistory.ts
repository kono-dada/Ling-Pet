import { defineStore } from 'pinia'

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

const exampleChatHistory: ChatHistoryItem[] = []

export const useChatHistoryStore = defineStore('chatHistory', {
  state: () => ({
    chatHistory: exampleChatHistory,
  }),
  actions: {
    addMessage(message: ChatHistoryItem) {
      this.chatHistory.push(message);
    },
    clear() {
      this.chatHistory = [];
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