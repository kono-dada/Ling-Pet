import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppearanceConfigStore = defineStore('appearanceConfig', () => {
  const petSize = ref(100) // Default size in pixels
  const opacity = ref(1) // Default transparency
  const showDecorations = ref(true) // Default to showing decorations

  return {
    petSize,
    opacity,
    showDecorations,
  }
});