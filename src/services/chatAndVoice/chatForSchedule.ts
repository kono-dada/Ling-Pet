import { type AIMessage } from "../../types/ai";
import { useAIConfigStore } from "../../stores/aiConfig";
import { constructMessageForSchedule } from "../llm/messageConstructor";
import { invokeLLM } from "../llm/invokeLLM";

/**
 * 专用于 Schedule 的对话调用：
 * - 使用 schedule 包装的提示词
 * - 不写入聊天历史
 * - 不处理任何工具调用（避免误改 memory 等）
 * - 失败时仅返回错误，不在 UI 中主动显示
 */
export async function chatForSchedule(
  taskPrompt: string,
): Promise<{ success: boolean; error?: string }> {
  const ac = useAIConfigStore();

  const hasConfig = Boolean(ac.apiKey && ac.baseURL && ac.model)
  if (!hasConfig) {
    return { success: false, error: 'AI服务未配置' };
  }

  const messages: AIMessage[] = await constructMessageForSchedule(taskPrompt)
  const resMsgs = await invokeLLM({ messages })
  console.log('[schedule] AI 返回消息条数:', resMsgs.length)
  return { success: true }
}
