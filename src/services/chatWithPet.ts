import { PetResponseItem } from "../types/ai";
import { AIMessage } from "../types/ai";
import { getResponseFormatPrompt } from "../constants/ai";
import { USER_PROMPT_WRAPPER } from "../constants/ai";
import { useAIConfigStore } from "../stores/aiConfig";
import { useChatHistoryStore } from "../stores/chatHistory";
import { callAIStream } from "./aiService";
import { computed } from "vue";


const ac = useAIConfigStore();
const chs = useChatHistoryStore();
const validateAIConfig = computed(() => Boolean(ac.apiKey && ac.baseURL && ac.model));

function parsePetResponseItemString(response: string): PetResponseItem | null {
  const parts = response.split('|');
  if (parts.length !== 3) return null;
  const [message, japanese, emotionPart] = parts.map(part => part.trim());
  if (!message || !japanese) return null;
  const code = Number(emotionPart);
  if (!Number.isInteger(code)) return null;
  return { message, japanese, emotion: code };
}

// 专门处理Pet响应格式的chunk处理器
function createPetResponseChunkHandler(onItemComplete: (item: PetResponseItem) => Promise<void>) {
  return async (_chunk: string, buffer: string): Promise<string> => {
    // 检查是否有完整的 <item></item> 标签
    const itemRegex = /<item>(.*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(buffer)) !== null) {
      const itemContent = match[1];
      console.log('检测到完整item:', itemContent);
      const parsedItem = parsePetResponseItemString(itemContent);

      if (parsedItem) {  // 如果解析成功，调用回调函数
        await onItemComplete(parsedItem);
        console.log('解析到完整item:', parsedItem);
      } else {
        console.warn('解析item失败:', itemContent);
      }
    }

    // 移除已处理的完整 item 标签，返回处理后的buffer
    return buffer.replace(/<item>.*?<\/item>/g, '');
  };
}

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

  const result = await callAIStream(messages, createPetResponseChunkHandler(onItemComplete));

  chs.addMessage({
    role: 'assistant',
    content: result.response // 将流式响应内容作为AI的回复
  });

  chs.$tauri.save();

  return { success: result.success, error: result.error };
}