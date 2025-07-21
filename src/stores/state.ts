import { defineStore } from 'pinia'
import { ref } from 'vue'
import { EmotionName } from '../types/emotion'

export const useStateStore = defineStore('state', () => {
  const currentEmotion = ref<EmotionName>('高兴') // Default emotion

  return {
    currentEmotion,
  }
});