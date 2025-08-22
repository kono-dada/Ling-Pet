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

/**
 * 获取Bert-VITS2的默认参数配置
 * 用于重置配置或提供参考值
 */
export function getBv2DefaultParams() {
  return {
    bv2SpeakerId: 0,
    bv2AudioFormat: 'wav',
    bv2Lang: 'zh',
    bv2Length: 1.0,
    bv2Noise: 0.33,
    bv2Noisew: 0.4,
    bv2SegmentSize: 50,
    bv2SdpRatio: 0.2,
  }
}

/**
 * 验证Bert-VITS2配置参数
 * 确保所有参数都在合理范围内
 */
export function validateBv2Config(vitsConfig: ReturnType<typeof useVitsConfigStore>): string[] {
  const errors: string[] = []

  if (!vitsConfig.baseURL) {
    errors.push('API地址不能为空')
  }

  if (vitsConfig.bv2SpeakerId < 0) {
    errors.push('说话人ID不能为负数')
  }

  if (vitsConfig.bv2Length <= 0 || vitsConfig.bv2Length > 10) {
    errors.push('语速参数应在0.1-10.0之间')
  }

  if (vitsConfig.bv2Noise < 0 || vitsConfig.bv2Noise > 2) {
    errors.push('采样噪声比例应在0.0-2.0之间')
  }

  if (vitsConfig.bv2Noisew < 0 || vitsConfig.bv2Noisew > 2) {
    errors.push('SDP噪声参数应在0.0-2.0之间')
  }

  if (vitsConfig.bv2SegmentSize <= 0 || vitsConfig.bv2SegmentSize > 200) {
    errors.push('分段阈值应在1-200之间')
  }

  if (vitsConfig.bv2SdpRatio < 0 || vitsConfig.bv2SdpRatio > 1) {
    errors.push('SDP/DP混合比应在0.0-1.0之间')
  }

  return errors
}

/**
 * 检查Bert-VITS2服务的健康状态
 * 这是一个更轻量级的检查，不实际生成音频
 */
export async function checkBv2Health(): Promise<boolean> {
  const vitsConfig = useVitsConfigStore()
  
  if (!vitsConfig.baseURL) {
    return false
  }

  try {
    // 格式化URL，但这里只需要基本地址进行健康检查
    const baseUrl = formatApiUrl(vitsConfig.baseURL, 'bert-vits2').replace('/voice/bert-vits2', '')
    
    // 尝试发送一个健康检查请求
    // 如果服务有健康检查端点，可以使用它
    // 否则使用主端点但设置较短的超时时间
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3秒超时

    const response = await fetch(baseUrl, {
      method: 'HEAD', // 使用HEAD请求来检查服务可用性
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    return response.ok || response.status === 405 // 405表示方法不被允许，但服务在运行
  } catch (error) {
    return false
  }
}