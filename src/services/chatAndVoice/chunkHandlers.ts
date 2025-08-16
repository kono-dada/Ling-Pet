import type { PetResponseItem } from "../../types/ai";

// 每个处理器接收并返回 buffer，实现管道式处理
export type ChunkHandler = (buffer: string) => Promise<string>;

/**
 * Combine multiple chunk handlers into one.
 * - Each handler maintains its own internal buffer to avoid cross-coupling.
 * - The returned handler will return the primary handler's buffer (default index 0)
 *   so legacy single-buffer consumers keep their semantics.
 */
export function createMultiChunkHandler(handlers: ChunkHandler[]): ChunkHandler {
  return async (buffer: string): Promise<string> => {
    let current = buffer;
    for (const handler of handlers) {
      current = await handler(current);
    }
    return current;
  };
}

// Pet 响应项解析
function parsePetResponseItemString(response: string): PetResponseItem | null {
  const parts = response.split('|');
  if (parts.length !== 3) return null;
  const [message, japanese, emotionPart] = parts.map(part => part.trim());
  if (!message || !japanese) return null;
  const code = Number(emotionPart);
  if (!Number.isInteger(code)) return null;
  return { message, japanese, emotion: code };
}

// 专门处理 Pet 响应格式的 chunk 处理器
export function createPetResponseChunkHandler(
  onItemComplete: (item: PetResponseItem) => Promise<void>
): ChunkHandler {
  return async (buffer: string): Promise<string> => {
    const itemRegex = /<item>(.*?)<\/item>/g;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(buffer)) !== null) {
      const itemContent = match[1];
      console.log('检测到完整item:', itemContent);
      const parsedItem = parsePetResponseItemString(itemContent);

      if (parsedItem) {
        await onItemComplete(parsedItem);
        console.log('解析到完整item:', parsedItem);
      } else {
        console.warn('解析item失败:', itemContent);
      }
    }

    // 移除已处理的完整 item 标签，返回处理后的 buffer
    return buffer.replace(/<item>.*?<\/item>/g, '');
  };
}
