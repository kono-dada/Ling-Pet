import { useVitsConfigStore, formatApiUrl, createBv2Payload, handleApiError, ENGINE_TYPES } from '../../stores/configs/vitsConfig'
import { fetch } from '@tauri-apps/plugin-http'

// Style-Bert-VITS2 语音合成
function voiceStyleBertVits2(
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
  const apiUrl = formatApiUrl(vitsConfig.baseURL, ENGINE_TYPES.STYLE_BERT_VITS2)

  return fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }).then(async response => {
    if (!response.ok) {
      await handleApiError(response, 'Style-Bert-VITS2')
    }
    return response.blob()
  })
}

// Bert-VITS2 语音合成
function voiceBertVits2(
  text: string,
  vitsConfig: ReturnType<typeof useVitsConfigStore>
): Promise<Blob> {
  // 使用提取的公共函数构建参数
  const payload = createBv2Payload(text, vitsConfig)

  // formatApiUrl 已经包含 /voice/bert-vits2 路径
  const apiUrl = formatApiUrl(vitsConfig.baseURL, ENGINE_TYPES.BERT_VITS2)

  return fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  }).then(async response => {
    if (!response.ok) {
      await handleApiError(response, 'Bert-VITS2')
    }
    return response.blob()
  })
}

// 主要的语音合成函数，根据引擎类型选择对应的实现
export async function voiceVits(
  text: string,
): Promise<Blob> {
  const vitsConfig = useVitsConfigStore()

  if (vitsConfig.engineType === ENGINE_TYPES.BERT_VITS2) {
    return voiceBertVits2(text, vitsConfig)
  } else {
    return voiceStyleBertVits2(text, vitsConfig)
  }
}