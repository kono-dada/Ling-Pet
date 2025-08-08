import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useVitsConfigStore = defineStore(
  'vitsConfig',
  () => {
    const on = ref(false) // 是否启用VITS服务
    const baseURL = ref('http://127.0.0.1:23456') // VITS API基础URL
    const ident = ref('Anneli') // 默认音色ID
    const sdpRatio = ref(0.0)
    const lengthScale = ref(1.0)
    const installPath = ref('') // VITS 安装路径
    const autoStartSbv2 = ref(false) // 应用启动时自动启动本地 sbv2_api
  const sbv2Pid = ref<number | null>(null) // 跨窗口持久化 PID

    return {
      baseURL,
      ident,
      on,
      sdpRatio,
      lengthScale,
      installPath,
      autoStartSbv2,
  sbv2Pid,
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
