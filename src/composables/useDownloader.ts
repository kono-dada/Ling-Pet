import { ref, onUnmounted } from 'vue'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

export interface DownloadOptions {
  headers?: Record<string, string>
  signal?: AbortSignal
}

export interface UseDownloader {
  // 下载进度：0-100，若为 null 表示服务端未提供内容长度，无法精确计算
  progress: ReturnType<typeof ref<number | null>>
  isDownloading: ReturnType<typeof ref<boolean>>
  error: ReturnType<typeof ref<string | null>>
  // 通过 URL 下载文件并返回 Blob
  download: (url: string, options?: DownloadOptions) => Promise<Blob>
  // 取消当前下载
  cancel: () => void
}

// 内部：统一 fetch（优先使用 Tauri 的 fetch 以规避 CORS；失败则回退到浏览器 fetch）
async function unifiedFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await tauriFetch(url, init as any)
  } catch (_) {
    return await fetch(url, init)
  }
}

export function useDownloader(): UseDownloader {
  const progress = ref<number | null>(0)
  const isDownloading = ref(false)
  const error = ref<string | null>(null)
  let abortController: AbortController | null = null

  async function download(url: string, options: DownloadOptions = {}): Promise<Blob> {
    isDownloading.value = true
    error.value = null
    progress.value = 0

    // 允许外部传入 signal，否则内部创建，便于 cancel()
    abortController = options.signal ? null : new AbortController()
    const signal = options.signal ?? abortController?.signal

    try {
      const response = await unifiedFetch(url, {
        method: 'GET',
        headers: options.headers,
        signal,
      })

      if (!response.ok) {
        throw new Error(`下载失败: ${response.status} ${response.statusText}`)
      }

      const contentLengthHeader =
        response.headers.get('content-length') || response.headers.get('Content-Length')
      const total = contentLengthHeader ? Number(contentLengthHeader) : NaN
      const canMeasure = Number.isFinite(total) && total > 0
      if (!canMeasure) {
        // 无法精确计算时，用 null 表示未知进度
        progress.value = null
      }

      // 优先采用流式读取更新进度
      const reader = (response as any).body?.getReader?.()
      if (reader && typeof reader.read === 'function') {
        const chunks: Uint8Array[] = []
        let received = 0
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (value) {
            chunks.push(value)
            received += value.length
            if (canMeasure) {
              progress.value = Math.min(100, Math.round((received / total) * 100))
            }
          }
        }
        // 合并为一个连续的 Uint8Array，确保其 buffer 为标准 ArrayBuffer
        const merged = new Uint8Array(received)
        let offset = 0
        for (const chunk of chunks) {
          merged.set(chunk, offset)
          offset += chunk.length
        }
        const blob = new Blob([merged])
        if (canMeasure) progress.value = 100
        return blob
      }

      // 回退：一次性读取，无法实时进度，仅在完成时置为 100
      const buffer = await (response as any).arrayBuffer?.()
      if (!buffer) {
        throw new Error('不支持的响应类型：无法读取数据')
      }
      progress.value = 100
      return new Blob([buffer])
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        error.value = '下载已取消'
      } else {
        error.value = e instanceof Error ? e.message : String(e)
      }
      throw e
    } finally {
      isDownloading.value = false
    }
  }

  function cancel() {
    abortController?.abort()
  }

  onUnmounted(() => {
    abortController?.abort()
  })

  return {
    progress,
    isDownloading,
    error,
    download,
    cancel,
  }
}
