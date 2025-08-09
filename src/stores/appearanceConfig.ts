import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppearanceConfigStore = defineStore(
  'appearanceConfig',
  () => {
    const petSize = ref(200) // Default size in pixels
    const opacity = ref(1) // Default transparency
  // 当前装饰类型: 'none' | 'circle' | 未来扩展其它名字
  const decorationType = ref<'none' | 'circle' | 'fallingStars'>('circle')

    return {
      petSize,
      opacity,
  decorationType,
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