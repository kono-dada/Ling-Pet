import { useVitsConfigStore } from '../stores/vitsConfig'

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

  const formData = new FormData()
  formData.append('text', text)
  formData.append('id', vitsConfig.id.toString())
  formData.append('format', vitsConfig.format)
  formData.append('lang', vitsConfig.lang)
  formData.append('length', vitsConfig.length.toString())
  formData.append('noise', vitsConfig.noise.toString())
  formData.append('noisew', vitsConfig.noisew.toString())
  formData.append('segment_size', vitsConfig.segmentSize.toString())

  const response = await fetch(`${vitsConfig.baseURL}/voice/vits`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    throw new Error(`VITS API error: ${response.status} ${response.statusText}`)
  }

  return response.blob()
}