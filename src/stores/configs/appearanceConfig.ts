import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import type { ColorTheme, EmotionDescription } from '../../types/emotion'

export const useAppearanceConfigStore = defineStore(
  'appearanceConfig',
  () => {
    const petSize = ref(200) // Default size in pixels
    const opacity = ref(1) // Default transparency
    const bubbleTransparent = ref(false) // 聊天气泡透明模式
    const bubbleShowBorder = ref(true) // 聊天气泡显示边框（透明模式下有效）
    // 当前装饰类型: 'none' | 'circle' | 未来扩展其它名字
    const decorationType = ref<'none' | 'circle' | 'fallingStars'>('circle')
    // 当前选中的表情包名称（跨窗口同步）
    const activeEmotionPackName = ref<string | null>(null)

    // 表情包运行时数据（响应式）
    const emotionPackRoot = ref<string>('')
    // 描述-编号映射不再对外使用，仅保留编号->描述
    const emotionCodeToDescription = ref<string[]>([])
    const defaultEmotionDescription = ref<EmotionDescription>('默认')
    const defaultEmotionCode = ref<number>(0)
    const emotionColors = reactive<Record<number, ColorTheme>>({})
    // 每当包内容变更/初始化完成时自增，驱动 UI 刷新与缓存击穿
    const emotionPackVersion = ref(0)

    const hasEmotionPack = computed(() => !!emotionPackRoot.value)

    return {
      petSize,
      opacity,
      bubbleTransparent,
      bubbleShowBorder,
      decorationType,
      activeEmotionPackName,
      // emotion pack runtime state
      emotionPackRoot,
      emotionCodeToDescription,
      defaultEmotionDescription,
      defaultEmotionCode,
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
