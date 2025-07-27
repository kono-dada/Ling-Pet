import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useVitsConfigStore = defineStore(
  'vitsConfig',
  () => {
    const on = ref(false) // 是否启用VITS服务
    const baseURL = ref('http://127.0.0.1:23456') // VITS API基础URL
    const id = ref(0) // 默认音色ID
    const format = ref('wav') // 默认音频格式
    const lang = ref('auto') // 默认语言
    const length = ref(1) // 默认语音长度
    const noise = ref(0.667) // 默认噪声
    const noisew = ref(0.8) // 默认噪声权重
    const segmentSize = ref(50) // 默认分段大小

    return {
      baseURL,
      id,
      format,
      lang,
      length,
      noise,
      noisew,
      segmentSize,
      on,
    }
  },
  {
    tauri: {
      saveOnChange: true,
      saveStrategy: 'debounce',
      saveInterval: 500,
    },
  }
)
