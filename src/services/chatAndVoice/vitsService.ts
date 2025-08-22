import { useVitsConfigStore, formatApiUrl } from '../../stores/configs/vitsConfig'
import { fetch } from '@tauri-apps/plugin-http'

// Style-Bert-VITS2 语音合成
async function voiceStyleBertVits2(
  text: string,
  vitsConfig: ReturnType<typeof useVitsConfigStore>
): Promise<Blob> {
  const body = {
    text,
    ident: vitsConfig.ident, // 使用配置中的音色ID
    sdp_ratio: vitsConfig.sdpRatio, // 使用配置中的SDP比率
    length_scale: vitsConfig.lengthScale, // 使用配置中的长度缩放
  }

  // formatApiUrl 已经包含 /synthesize 路径
  const apiUrl = formatApiUrl(vitsConfig.baseURL, 'style-bert-vits2')

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new Error(`Style-Bert-VITS2 API error: ${response.status} ${response.statusText}`)
  }

  return response.blob()
}

// Bert-VITS2 语音合成
async function voiceBertVits2(
  text: string,
  vitsConfig: ReturnType<typeof useVitsConfigStore>
): Promise<Blob> {
  const payload = {
    id: vitsConfig.bv2SpeakerId,
    format: vitsConfig.bv2AudioFormat,
    lang: vitsConfig.bv2Lang,
    length: vitsConfig.bv2Length, // 语速
    noise: vitsConfig.bv2Noise, // 采样噪声比例
    noisew: vitsConfig.bv2Noisew, // SDP噪声
    segment_size: vitsConfig.bv2SegmentSize, // 分段阈值
    sdp_ratio: vitsConfig.bv2SdpRatio, // SDP/DP混合比
    text: text
  }

  // formatApiUrl 已经包含 /voice/bert-vits2 路径
  const apiUrl = formatApiUrl(vitsConfig.baseURL, 'bert-vits2')

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Bert-VITS2 API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  return response.blob()
}

// 主要的语音合成函数，根据引擎类型选择对应的实现
export async function voiceVits(
  text: string,
): Promise<Blob> {
  const vitsConfig = useVitsConfigStore()

  if (vitsConfig.engineType === 'bert-vits2') {
    return voiceBertVits2(text, vitsConfig)
  } else {
    return voiceStyleBertVits2(text, vitsConfig)
  }
}