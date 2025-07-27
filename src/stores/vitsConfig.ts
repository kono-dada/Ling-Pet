import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useVitsConfigStore = defineStore(
  'vitsConfig',
  () => {
    const on = ref(false) // 是否启用VITS服务
    const baseURL = ref('http://127.0.0.1:23456') // VITS API基础URL
    const ident = ref('Anneli') // 默认音色ID

    return {
      baseURL,
      ident,
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
