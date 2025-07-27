import { defineStore } from 'pinia'
import { PetResponseItem } from '../types/ai';

export const useChatBubbleStateStore = defineStore('chatBubbleState', {
  state: () => ({
    currentMessage: '',
    responseItems: [] as PetResponseItem[],
    isStreaming: false,
  }),
  actions: {
    setCurrentMessage(message: string) {
      this.currentMessage = message;
    },
    setItems(items: PetResponseItem[]) {
      this.responseItems = items;
    },
    addItem(item: PetResponseItem) {
      this.responseItems.push(item);
    },
    setStreaming(isStreaming: boolean) {
      this.isStreaming = isStreaming;
    },
    shiftNext() {
      return this.responseItems.shift();
    },
    clear() {
      this.responseItems = [];
    }
  },
});