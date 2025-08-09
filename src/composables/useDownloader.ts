import { ref, onUnmounted } from 'vue'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import { open as fsOpen, remove as fsRemove, rename as fsRename } from '@tauri-apps/plugin-fs'

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
  // 通过 URL 以流式写入的方式直接保存到文件，避免占用内存
  downloadToFile: (url: string, destPath: string, options?: DownloadOptions & { tmpSuffix?: string }) => Promise<void>
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

  // 以流的方式直接写入磁盘文件，避免将完整内容保存在内存
  async function downloadToFile(
    url: string,
    destPath: string,
    options: DownloadOptions & { tmpSuffix?: string } = {}
  ): Promise<void> {
    isDownloading.value = true
    error.value = null
    progress.value = 0

    // 允许外部传入 signal，否则内部创建
    abortController = options.signal ? null : new AbortController()
    const signal = options.signal ?? abortController?.signal

    // 临时文件，避免半文件命名冲突
    const tmpPath = `${destPath}${options.tmpSuffix ?? '.part'}`

    try {
      const response = await unifiedFetch(url, {
        method: 'GET',
        headers: options.headers,
        signal,
      })
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status} ${response.statusText}`)
      }

      const contentLengthHeader = response.headers.get('content-length') || response.headers.get('Content-Length')
      const total = contentLengthHeader ? Number(contentLengthHeader) : NaN
      const canMeasure = Number.isFinite(total) && total > 0
      if (!canMeasure) progress.value = null

      // 打开文件句柄（创建/截断）
      const file = await fsOpen(tmpPath, { write: true, create: true, truncate: true })
      try {
        const reader = (response as any).body?.getReader?.()
        if (!reader || typeof reader.read !== 'function') {
          // 回退方案：一次性读入（不推荐），但保持兼容性
          const buffer = await (response as any).arrayBuffer?.()
          if (!buffer) throw new Error('不支持的响应类型：无法读取数据')
          await file.write(new Uint8Array(buffer))
          progress.value = 100
        } else {
          let received = 0
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (value) {
              await file.write(value)
              received += value.length
              if (canMeasure) {
                progress.value = Math.min(100, Math.round((received / total) * 100))
              }
            }
          }
          if (canMeasure) progress.value = 100
        }
      } finally {
        await file.close()
      }

      // 写入完成后原子移动为目标文件
      await fsRename(tmpPath, destPath)
    } catch (e: any) {
      // 出错或取消，尝试清理临时文件
      try { await fsRemove(tmpPath) } catch (_) { /* noop */ }
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
    downloadToFile,
    cancel,
  }
}
