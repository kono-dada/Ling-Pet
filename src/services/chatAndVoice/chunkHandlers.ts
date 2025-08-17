import type { PetResponseItem } from "../../types/ai";
import { parsePetResponseItemString } from "../../utils/aiResponse";

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

// 工具调用解析器：解析 <tool><name>..</name><arguments>..</arguments></tool>
export function createToolCallChunkHandler(
  onItemComplete: (name: string, args: string[]) => Promise<{ success: boolean; result?: unknown; error?: string }>
): ChunkHandler {
  return async (buffer: string): Promise<string> => {
    const toolRegex = /<tool>([\s\S]*?)<\/tool>/g;
    let match: RegExpExecArray | null;

    while ((match = toolRegex.exec(buffer)) !== null) {
      const toolContent = match[1] ?? '';
      const nameMatch = /<name>([\s\S]*?)<\/name>/.exec(toolContent);
      const argsMatch = /<arguments>([\s\S]*?)<\/arguments>/.exec(toolContent);

      const rawName = nameMatch?.[1]?.trim() ?? '';
      const rawArgs = argsMatch?.[1]?.trim() ?? '';

      if (rawName) {
        // 多参数以英文逗号分隔，修剪前后空白与引号
        const args = rawArgs
          .split(',')
          .map((s) => s.trim())
          .map((s) => s.replace(/^['"“”‘’]|['"“”‘’]$/g, ''))
          .filter((s) => s.length > 0);

        try {
          console.log('解析到工具调用:', { name: rawName, args });
          await onItemComplete(rawName, args);
        } catch (e) {
          console.warn('处理工具调用回调时出错:', e);
        }
      } else {
        console.warn('解析工具调用失败，缺少 <name> 或 <arguments>');
      }
    }

    // 去除已处理的 <tool> 区块
    return buffer.replace(/<tool>[\s\S]*?<\/tool>/g, '');
  };
}
