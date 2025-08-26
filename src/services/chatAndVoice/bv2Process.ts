import { useVitsConfigStore, formatApiUrl, createBv2Payload, handleApiError, handleConnectionError, ENGINE_TYPES } from '../../stores/configs/vitsConfig'
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
  const apiUrl = formatApiUrl(vitsConfig.baseURL, ENGINE_TYPES.BERT_VITS2)

  // 使用提取的公共函数构建测试参数
  const testPayload = createBv2Payload('测试', vitsConfig)

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    })

    if (!response.ok) {
      await handleApiError(response, 'VITS Simple API')
    }

    // 检查返回的内容类型
    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('audio')) {
      console.warn('VITS Simple API服务返回的内容类型不是音频，但状态码正常')
    }
  } catch (error) {
    handleConnectionError(error, apiUrl, 'VITS Simple API')
  }
}