import { useVitsConfigStore } from '../stores/vitsConfig'
import { fetch } from '@tauri-apps/plugin-http'

export interface VitsOptions {
  id?: number
  format?: string
  lang?: string
  length?: number
  noise?: number
  noisew?: number
  segmentSize?: number
}

export async function voiceVits(
  text: string,
): Promise<Blob> {
  const vitsConfig = useVitsConfigStore()

  const body = {
    text,
    ident: vitsConfig.ident, // 使用配置中的音色ID
    // 其他参数可以加进来
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