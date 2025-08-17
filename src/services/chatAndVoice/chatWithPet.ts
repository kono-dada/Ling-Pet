import { PetResponseItem } from "../../types/ai";
import { AIMessage } from "../../types/ai";
import { getResponseFormatPrompt } from "../../constants/ai";
import { USER_PROMPT_WRAPPER } from "../../constants/ai";
import { useAIConfigStore } from "../../stores/aiConfig";
import { useChatHistoryStore } from "../../stores/chatHistory";
import { callAIStream } from "./aiService";
import { createPetResponseChunkHandler, createToolCallChunkHandler } from "./chunkHandlers";
import { computed } from "vue";
import { callToolByName } from "../tools";


const ac = useAIConfigStore();
const chs = useChatHistoryStore();
const validateAIConfig = computed(() => Boolean(ac.apiKey && ac.baseURL && ac.model));

export async function chatWithPetStream(
  userMessage: string,
  onItemComplete: (item: PetResponseItem) => Promise<void>
): Promise<{ success: boolean; error?: string }> {
  // 检查配置是否完整
  if (!validateAIConfig.value) {
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
  // 添加历史消息的最末尾的ac.maxHistoryLength条消息
  const historyLength = Math.min(chs.chatHistory.length, ac.historyMaxLength);
  for (let i = chs.chatHistory.length - historyLength; i < chs.chatHistory.length; i++) {
    const message = chs.chatHistory[i];
    if (message.role === 'user' || message.role === 'assistant') {
      messages.push(message);
    }
  }
  // 添加用户消息
  messages.push({
    role: 'user',
    content: USER_PROMPT_WRAPPER.replace('{}', userMessage)
  });

  // 添加user消息到聊天历史
  chs.addMessage({
    role: 'user',
    content: userMessage
  });

  const result = await callAIStream(messages, [
    createPetResponseChunkHandler(onItemComplete),
    createToolCallChunkHandler(callToolByName)
  ]);

  chs.addMessage({
    role: 'assistant',
    content: result.response // 将流式响应内容作为AI的回复
  });

  chs.$tauri.save();

  return { success: result.success, error: result.error };
}
