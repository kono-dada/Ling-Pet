import { defineStore } from 'pinia'
import { PetResponseItem } from '../types/ai';

export interface PetResponseItemWithAudio extends PetResponseItem {
  audioBlob?: Blob;
}

export const useChatBubbleStateStore = defineStore('chatBubbleState', {
  state: () => ({
    currentMessage: '',
    responseItems: [] as PetResponseItemWithAudio[],
    isStreaming: false,
    currentAudio: null as HTMLAudioElement | null,
  }),
  actions: {
    setCurrentMessage(message: string) {
      this.currentMessage = message;
    },
    setItems(items: PetResponseItemWithAudio[]) {
      this.responseItems = items;
    },
    addItem(item: PetResponseItemWithAudio) {
      this.responseItems.push(item);
    },
    setStreaming(isStreaming: boolean) {
      this.isStreaming = isStreaming;
    },
    shiftNext() {
      return this.responseItems.shift();
    },
    setCurrentAudio(audio: HTMLAudioElement | null) {
      this.currentAudio = audio;
    },
    clear() {
      this.responseItems = [];
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio = null;
      }
    }
  },
});