import { PetResponseItem } from "../../types/ai";
import { getResponseFormatPrompt, SCHEDULE_PROMPT_WRAPPER } from "../../constants/ai";
import { useAIConfigStore } from "../../stores/aiConfig";
import { callAIStream } from "./aiService";
import { createPetResponseChunkHandler } from "./chunkHandlers";

/**
 * 专用于 Schedule 的对话调用：
 * - 使用 schedule 包装的提示词
 * - 不写入聊天历史
 * - 不处理任何工具调用（避免误改 memory 等）
 * - 失败时仅返回错误，不在 UI 中主动显示
 */
export async function chatForSchedule(
  taskPrompt: string,
  onItemComplete: (item: PetResponseItem) => Promise<void>,
): Promise<{ success: boolean; error?: string }> {
  const ac = useAIConfigStore();

  const hasConfig = Boolean(ac.apiKey && ac.baseURL && ac.model)
  if (!hasConfig) {
    return { success: false, error: 'AI服务未配置' };
  }

  const messages = [] as { role: 'system' | 'user'; content: string }[];

  if (ac.systemPrompt) {
    messages.push({ role: 'system', content: getResponseFormatPrompt() + '\n\n' + ac.systemPrompt });
  }

  const wrapped = SCHEDULE_PROMPT_WRAPPER.replace('{}', taskPrompt)
  messages.push({ role: 'user', content: wrapped });

  const result = await callAIStream(messages, [
    createPetResponseChunkHandler(onItemComplete),
    // 忽略所有 <tool> 调用，直接剔除
    async (buffer: string) => buffer.replace(/<tool>[\s\S]*?<\/tool>/g, ''),
  ]);

  return { success: result.success, error: result.error };
}
