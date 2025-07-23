import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppearanceConfigStore = defineStore(
  'appearanceConfig',
  () => {
    const petSize = ref(200) // Default size in pixels
    const opacity = ref(1) // Default transparency
    const showDecorations = ref(true) // Default to showing decorations

    return {
      petSize,
      opacity,
      showDecorations,
    }
  },
  {
    tauri: {
      saveOnChange: true,

      // You can also debounce or throttle when saving.
      // This is optional. The default behavior is to save immediately.
      saveStrategy: 'debounce',
      saveInterval: 500,
    },
  }
);