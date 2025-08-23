import { useVitsConfigStore, formatApiUrl } from '../../stores/configs/vitsConfig'
import { fetch } from '@tauri-apps/plugin-http'

/**
 * 测试Bert-VITS2服务连接
 * 发送一个简单的测试请求来验证服务是否可用
 */
export async function probeBv2(): Promise<void> {
  const vitsConfig = useVitsConfigStore()
  
  if (!vitsConfig.baseURL) {
    throw new Error('请先配置VITS Simple API服务器地址')
  }

  // 格式化URL，自动添加 /voice/bert-vits2 路径
  const apiUrl = formatApiUrl(vitsConfig.baseURL, 'bert-vits2')

  // 使用短文本进行测试
  const testPayload = {
    id: vitsConfig.bv2SpeakerId,
    format: vitsConfig.bv2AudioFormat,
    lang: vitsConfig.bv2Lang,
    length: vitsConfig.bv2Length,
    noise: vitsConfig.bv2Noise,
    noisew: vitsConfig.bv2Noisew,
    segment_size: vitsConfig.bv2SegmentSize,
    sdp_ratio: vitsConfig.bv2SdpRatio,
    text: '测试'
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`VITS Simple API服务响应错误: ${response.status} ${response.statusText} - ${errorText}`)
    }

    // 检查返回的内容类型
    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('audio')) {
      console.warn('VITS Simple API服务返回的内容类型不是音频，但状态码正常')
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`无法连接到VITS Simple API服务: ${apiUrl}`)
    }
    throw error
  }
}





