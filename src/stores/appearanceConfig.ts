import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import type { ColorTheme, EmotionName } from '../types/emotion'

export const useAppearanceConfigStore = defineStore(
  'appearanceConfig',
  () => {
    const petSize = ref(200) // Default size in pixels
    const opacity = ref(1) // Default transparency
    // 当前装饰类型: 'none' | 'circle' | 未来扩展其它名字
    const decorationType = ref<'none' | 'circle' | 'fallingStars'>('circle')
    // 当前选中的表情包名称（跨窗口同步）
    const activeEmotionPackName = ref<string | null>(null)

    // 表情包运行时数据（响应式）
    const emotionPackRoot = ref<string>('')
    const emotionNameToCode = reactive<Record<string, number>>({})
    const emotionCodeToName = ref<string[]>([])
    const defaultEmotionName = ref<EmotionName>('默认')
    const emotionColors = reactive<Record<number, ColorTheme>>({})
    // 每当包内容变更/初始化完成时自增，驱动 UI 刷新与缓存击穿
    const emotionPackVersion = ref(0)

    const hasEmotionPack = computed(() => !!emotionPackRoot.value)

    return {
      petSize,
      opacity,
      decorationType,
      activeEmotionPackName,
      // emotion pack runtime state
      emotionPackRoot,
      emotionNameToCode,
      emotionCodeToName,
      defaultEmotionName,
      emotionColors,
      emotionPackVersion,
      hasEmotionPack,
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