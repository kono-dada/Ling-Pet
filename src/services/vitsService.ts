import { useVitsConfigStore } from '../stores/vitsConfig'
import { fetch } from '@tauri-apps/plugin-http'

export async function voiceVits(
  text: string,
): Promise<Blob> {
  const vitsConfig = useVitsConfigStore()

  const body = {
    text,
    ident: vitsConfig.ident, // 使用配置中的音色ID
    sdp_ratio: vitsConfig.sdpRatio, // 使用配置中的SDP比率
    length_scale: vitsConfig.lengthScale, // 使用配置中的长度缩放
  }

  const response = await fetch(`${vitsConfig.baseURL}/synthesize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new Error(`VITS API error: ${response.status} ${response.statusText}`)
  }

  return response.blob()
}