import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DEFAULT_CHARACTER_PROMPT } from '../constants/ai';

export const useAIConfigStore = defineStore(
  'aiConfig',
  () => {
    const apiKey = ref('') // 默认API密钥为空
    const baseURL = ref('https://api.deepseek.com/v1') // 默认基础URL为空
    const model = ref('deepseek-chat') // 默认模型
    const temperature = ref(0.7) // 默认温度
    const maxTokens = ref(2000) // 默认最大令牌数
    const systemPrompt = ref(DEFAULT_CHARACTER_PROMPT) // 默认系统提示为空

    return {
      apiKey,
      baseURL,
      model,
      temperature,
      maxTokens,
      systemPrompt,
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