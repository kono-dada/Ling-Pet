import { defineStore } from 'pinia'
import type { AIMessage } from '../types/ai';

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
    }
  },
});