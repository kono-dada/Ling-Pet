import type { PetResponseItem } from '../types/ai'

// 解析单个 <item> 内部的字符串为 PetResponseItem
export function parsePetResponseItemString(response: string): PetResponseItem | null {
  const parts = response.split('|')
  if (parts.length !== 3) return null
  const [message, japanese, emotionPart] = parts.map(part => part.trim())
  if (!message || !japanese) return null
  const code = Number(emotionPart)
  if (!Number.isInteger(code)) return null
  return { message, japanese, emotion: code }
}

// 从完整内容中提取所有 <item>...</item>，并解析为 PetResponseItem 数组
export function extractItemsFromContent(content: string): PetResponseItem[] {
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  const result: PetResponseItem[] = []
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(content)) !== null) {
    const itemContent = match[1] ?? ''
    const parsed = parsePetResponseItemString(itemContent)
    if (parsed) result.push(parsed)
  }
  return result
}

