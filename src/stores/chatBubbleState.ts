import { defineStore } from 'pinia'
import { PetResponseItem } from '../types/ai';

export const useChatBubbleStateStore = defineStore('chatBubbleState', {
  state: () => ({
    currentMessage: '',
    responseItems: [] as PetResponseItem[],
  }),
  actions: {
    setCurrentMessage(message: string) {
      this.currentMessage = message;
    },
    setItems(items: PetResponseItem[]) {
      this.responseItems = items;
    },
    shiftNext() {
      return this.responseItems.shift();
    },
    clear() {
      this.responseItems = [];
    }
  },
});