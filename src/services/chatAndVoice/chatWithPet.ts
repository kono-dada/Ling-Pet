import { AIMessage } from "../../types/ai";
import { getResponseFormatPrompt } from "../../constants/ai";
import { USER_PROMPT_WRAPPER } from "../../constants/ai";
import { useAIConfigStore } from "../../stores/aiConfig";
import { useChatHistoryStore } from "../../stores/chatHistory";
import { useConversationStore } from "../../stores/conversation";
import { callAIStream } from "./aiService";
import { createPetResponseChunkHandler, createToolCallChunkHandler } from "./chunkHandlers";
// no top-level Pinia store usage to avoid getActivePinia errors
import { callToolByName } from "../tools";

export async function chatWithPetStream(
  userMessage: string,
): Promise<{ success: boolean; error?: string }> {
  // Lazily access stores here to ensure Pinia is active
  const ac = useAIConfigStore();
  const chs = useChatHistoryStore();
  const conversation = useConversationStore();

  // 检查配置是否完整
  const hasConfig = Boolean(ac.apiKey && ac.baseURL && ac.model)
  if (!hasConfig) {
    return {
      success: false,
      error: '请正确配置AI服务'
    };
  }

  const messages: AIMessage[] = [];
  // 添加系统提示词和响应格式要求
  if (ac.systemPrompt) {
    messages.push({
      role: 'system',
  content: getResponseFormatPrompt() + '\n\n' + ac.systemPrompt
    });
  }
  // 添加历史消息（默认：全量窗口化历史，长度受限）
  const historyLength = Math.min(chs.chatHistory.length, ac.historyMaxLength);
  for (let i = chs.chatHistory.length - historyLength; i < chs.chatHistory.length; i++) {
    const message = chs.chatHistory[i];
    if (message.role === 'user' || message.role === 'assistant') {
      messages.push(message);
    }
  }
  // 添加用户消息
  const wrappedContent = USER_PROMPT_WRAPPER.replace('{}', userMessage)
  messages.push({
    role: 'user',
    content: wrappedContent,
  });

  // 添加 user 消息到聊天历史（默认开启）
  chs.addMessage({
    role: 'user',
    content: userMessage
  });

  const result = await callAIStream(messages, [
    createPetResponseChunkHandler(conversation.addItem),
    createToolCallChunkHandler(callToolByName)
  ]);

  chs.addMessage({
    role: 'assistant',
    content: result.response // 将流式响应内容作为AI的回复
  });

  chs.$tauri.save();

  return { success: result.success, error: result.error };
}
