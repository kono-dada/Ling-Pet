import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 格式化URL，确保包含协议和正确的API路径
 * 智能处理各种URL格式，有无http前缀都能正常工作
 */
export function formatApiUrl(url: string, engineType: 'style-bert-vits2' | 'bert-vits2' = 'style-bert-vits2'): string {
  if (!url) return ''
  
  let cleanUrl = url.trim()
  
  // 如果已经包含协议，直接使用
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    // 检查是否已经包含API路径，如果没有则添加
    if (engineType === 'bert-vits2' && !cleanUrl.includes('/voice/bert-vits2')) {
      return cleanUrl.replace(/\/$/, '') + '/voice/bert-vits2'
    }
    if (engineType === 'style-bert-vits2' && !cleanUrl.includes('/synthesize')) {
      return cleanUrl.replace(/\/$/, '') + '/synthesize'
    }
    return cleanUrl
  }
  
  // 移除可能存在的多余的协议前缀（处理用户输入错误的情况）
  cleanUrl = cleanUrl.replace(/^(https?:\/\/)+/g, '')
  
  // 确保格式正确（处理可能缺少端口的情况）
  if (cleanUrl && !cleanUrl.includes(':')) {
    // 如果没有端口，根据引擎类型添加默认端口
    const defaultPort = engineType === 'bert-vits2' ? '6006' : '23456'
    cleanUrl = `${cleanUrl}:${defaultPort}`
  }
  
  // 添加http协议前缀和对应的API路径
  const baseUrl = `http://${cleanUrl}`
  
  if (engineType === 'bert-vits2') {
    return baseUrl + '/voice/bert-vits2'
  } else {
    return baseUrl + '/synthesize'
  }
}

export const useVitsConfigStore = defineStore(
  'vitsConfig',
  () => {
    const on = ref(false) // 是否启用VITS服务
    const baseURL = ref('127.0.0.1:23456') // VITS API基础URL（不带协议）
    const ident = ref('Anneli') // 默认音色ID (Style-Bert-VITS2)
    const sdpRatio = ref(0.0)
    const lengthScale = ref(1.0)
    const installPath = ref('') // VITS 安装路径
    const autoStartSbv2 = ref(false) // 应用启动时自动启动本地 sbv2_api
    const sbv2Pid = ref<number | null>(null) // 跨窗口持久化 PID
    
    // 引擎类型选择
    const engineType = ref<'style-bert-vits2' | 'bert-vits2'>('style-bert-vits2')
    
    // Bert-VITS2 专用配置
    const bv2SpeakerId = ref(0) // Bert-VITS2 说话人ID
    const bv2AudioFormat = ref('wav') // 音频格式
    const bv2Lang = ref('zh') // 语言
    const bv2Length = ref(1.0) // 语速
    const bv2Noise = ref(0.33) // 采样噪声比例
    const bv2Noisew = ref(0.4) // SDP噪声
    const bv2SegmentSize = ref(50) // 分段阈值
    const bv2SdpRatio = ref(0.2) // SDP/DP混合比

    return {
      baseURL,
      ident,
      on,
      sdpRatio,
      lengthScale,
      installPath,
      autoStartSbv2,
      sbv2Pid,
      engineType,
      bv2SpeakerId,
      bv2AudioFormat,
      bv2Lang,
      bv2Length,
      bv2Noise,
      bv2Noisew,
      bv2SegmentSize,
      bv2SdpRatio,
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
