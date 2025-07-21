import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppearanceConfigStore = defineStore('appearanceConfig', () => {
  const petSize = ref(100) // Default size in pixels
  const transparency = ref(1) // Default transparency

  return {
    petSize,
    transparency,
  }
});