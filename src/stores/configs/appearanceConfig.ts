import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import type { ColorTheme, EmotionDescription } from '../../types/emotion'

export const useAppearanceConfigStore = defineStore(
  'appearanceConfig',
  () => {
    // 宠物基本外观设置
    const petSize = ref(200) // Default size in pixels
    const opacity = ref(1) // Default transparency
    
    // 聊天气泡设置
    const bubbleTransparent = ref(false) // 聊天气泡透明模式
    const bubbleShowBorder = ref(true) // 聊天气泡显示边框（透明模式下有效）
    
    // 开发者工具设置
    const showDevTools = ref(false) // 显示开发者工具选项
    
    // 固定桌宠设置
    const isPetFixed = ref(false) // 是否启用固定桌宠功能
    
    // Avatar类型: 'image' | 'live2d'
    const avatarType = ref<'image' | 'live2d'>('image')
    
    // 装饰效果类型: 'none' | 'circle' | 'fallingStars'
    const decorationType = ref<'none' | 'circle' | 'fallingStars'>('circle')
    
    // Live2D相关设置
    const live2dBorderType = ref<'none' | 'circle'>('none') // Live2D边界类型
    const live2dModelScale = ref(0.08) // Live2D模型缩放比例
    const live2dModelPositionX = ref(0.5) // Live2D模型水平位置(0-1)
    const live2dModelPositionY = ref(0.8) // Live2D模型垂直位置(0-1)
    
    // 表情包设置
    const activeEmotionPackName = ref<string | null>(null) // 当前选中的表情包名称

    // 表情包运行时数据
    const emotionPackRoot = ref<string>('') // 表情包根路径
    const emotionCodeToDescription = ref<string[]>([]) // 编号->描述映射
    const defaultEmotionDescription = ref<EmotionDescription>('默认') // 默认表情描述
    const defaultEmotionCode = ref<number>(0) // 默认表情编号
    const emotionColors = reactive<Record<number, ColorTheme>>({}) // 表情颜色主题
    const emotionPackVersion = ref(0) // 表情包版本号，用于驱动UI刷新

    // 计算属性：是否有表情包
    const hasEmotionPack = computed(() => !!emotionPackRoot.value)

    return {
      // 基本外观设置
      petSize,
      opacity,
      
      // 聊天气泡设置
      bubbleTransparent,
      bubbleShowBorder,
      
      // 开发者工具
      showDevTools,
      
      // 固定桌宠
      isPetFixed,
      
      // Avatar和装饰设置
      avatarType,
      decorationType,
      
      // Live2D设置
      live2dBorderType,
      live2dModelScale,
      live2dModelPositionX,
      live2dModelPositionY,
      
      // 表情包设置
      activeEmotionPackName,
      
      // 表情包运行时状态
      emotionPackRoot,
      emotionCodeToDescription,
      defaultEmotionDescription,
      defaultEmotionCode,
      emotionColors,
      emotionPackVersion,
      
      // 计算属性
      hasEmotionPack,
    }
  },
  {
    tauri: {
      saveOnChange: true,
      // 使用防抖策略保存配置，避免频繁写入
      saveStrategy: 'debounce',
      saveInterval: 500,
    },
  }
)