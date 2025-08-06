import { EmotionName } from "../types/emotion";
import { PetResponseItem } from "../types/ai";
import { EMOTIONS } from "../constants/emotions";
import { AIMessage } from "../types/ai";
import { RESPONSE_FORMAT_PROMPT } from "../constants/ai";
import { USER_PROMPT_WRAPPER } from "../constants/ai";
import { useAIConfigStore } from "../stores/aiConfig";
import { useChatHistoryStore } from "../stores/chatHistory";
import { useAIService } from "./aiService";
import { computed } from "vue";
import { useScenarioStore } from "../stores/scenario";


const ac = useAIConfigStore();
const chs = useChatHistoryStore();
const validateAIConfig = computed(() => Boolean(ac.apiKey && ac.baseURL && ac.model));
const { callAIStream } = useAIService();
const scenarioStore = useScenarioStore();
scenarioStore.initializeState();

function parsePetResponseItemString(response: string): PetResponseItem | null {
  const parts = response.split('|');
  if (parts.length !== 3) return null;
  const [message, japanese, emotion] = parts.map(part => part.trim());
  if (!message || !japanese || !EMOTIONS.includes(emotion as EmotionName)) {
    return null;
  }
  return {
    message,
    japanese,
    emotion: emotion as EmotionName,
  };
}

// 专门处理Pet响应格式的chunk处理器
function createPetResponseChunkHandler(onItemComplete: (item: PetResponseItem) => Promise<void>) {
  return async (_chunk: string, buffer: string): Promise<string> => {
    // 检查是否有完整的 <item></item> 标签
    const itemRegex = /<item>(.*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(buffer)) !== null) {
      const itemContent = match[1];
      const parsedItem = parsePetResponseItemString(itemContent);

      if (parsedItem) {  // 如果解析成功，调用回调函数
        await onItemComplete(parsedItem);
      } else {
        console.warn('解析item失败:', itemContent);
      }
    }

    // 移除已处理的完整 item 标签，返回处理后的buffer
    return buffer.replace(/<item>.*?<\/item>/g, '');
  };
}

// 从AI回复中提取JSON state和<next-scenario>
function extractStateAndNextScenario(response: string): { state: Record<string, any>, nextScenario: string | null } {
  let state: Record<string, any> = {};
  let nextScenario: string | null = null;

  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      state = JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.warn('State JSON解析失败:', e);
    }
  }

  const scenarioMatch = response.match(/<next-scenario>(.*?)<\/next-scenario>/);
  if (scenarioMatch) {
    nextScenario = scenarioMatch[1].trim();
  }

  return { state, nextScenario };
}

export async function chatWithPetStream(
  userMessage: string,
  onItemComplete: (item: PetResponseItem) => Promise<void>
): Promise<{ success: boolean; error?: string }> {
  const scenarioPrompt = scenarioStore.getPrompt();
  console.log('当前Scenario提示:', scenarioPrompt);
  console.log(scenarioStore.currentScenarioKey)

  // 检查配置是否完整
  if (!validateAIConfig.value) {
    return {
      success: false,
      error: '请正确配置AI服务'
    };
  }

  const messages: AIMessage[] = [];
  // 添加系统提示词和响应格式要求
  messages.push({
    role: 'system',
    content: ac.characterPrompt + '\n\n' + RESPONSE_FORMAT_PROMPT
  });

  // 添加历史消息的最末尾的ac.maxHistoryLength条消息
  const historyLength = Math.min(chs.chatHistory.length, ac.historyMaxLength);
  const historyMessages = [];
  for (let i = chs.chatHistory.length - historyLength; i < chs.chatHistory.length; i++) {
    const message = chs.chatHistory[i];
    switch (message.role) {
      case 'user':
        historyMessages.push({ 我: message.content });
        break;
      case 'assistant':
        historyMessages.push({ 你: message.content });
        break;
    }
  }
  // 添加用户消息
  messages.push({
    role: 'user',
    content: scenarioPrompt + '\n\n' + '以下是聊天历史:\n' + JSON.stringify(historyMessages, null, 2) + '\n\n' + USER_PROMPT_WRAPPER.replace('{message}', userMessage)
  });

  // 添加user消息到聊天历史
  chs.addMessage({
    role: 'user',
    content: userMessage
  });

  const result = await callAIStream(messages, createPetResponseChunkHandler(onItemComplete));

  // 解析AI回复中的state和<next-scenario>
  const { state: updatedState, nextScenario } = extractStateAndNextScenario(result.response);

  if (Object.keys(updatedState).length > 0) {
    scenarioStore.updateState(updatedState);
  }
  if (nextScenario && nextScenario !== scenarioStore.currentScenarioKey) {
    scenarioStore.setScenarioByKey(nextScenario);
  }

  chs.addMessage({
    role: 'assistant',
    content: result.response // 将流式响应内容作为AI的回复
  });

  chs.$tauri.save();
  scenarioStore.$tauri.save();

  console.log('AI回复:', result.response);
  console.log('更新后的状态:', updatedState);

  return { success: result.success, error: result.error };
}