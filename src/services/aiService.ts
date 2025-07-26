import { useAIConfigStore } from '../stores/aiConfig';
import { useChatHistoryStore } from '../stores/chatHistory';
import { computed } from 'vue';
import type { AIMessage, PetResponse, PetResponseItem } from '../types/ai';
import { DEFAULT_CHARACTER_PROMPT, RESPONSE_FORMAT_PROMPT, USER_PROMPT_WRAPPER } from '../constants/ai';
import { EMOTIONS } from '../constants/emotions';
import { EmotionName } from '../types/emotion';
import type { ChatCompletion } from 'openai/resources';
import { fetch } from '@tauri-apps/plugin-http';


export function useAIService() {
  const ac = useAIConfigStore();
  const chs = useChatHistoryStore();
  const validateAIConfig = computed(() => Boolean(ac.apiKey && ac.baseURL && ac.model));

  async function callAI(messages: AIMessage[]): Promise<ChatCompletion> {
    const url = ac.baseURL.replace(/\/+$/, '') + '/chat/completions';
    console.log('调用AI服务:', url);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ac.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ac.model,
        messages: messages,
      }),
    });

    console.log('发送的消息:', messages);
    const result = await res.json();
    console.log('AI响应:', result);
    return result as ChatCompletion;
  }

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

  async function chatWithPet(userMessage: string): Promise<PetResponse> {
    // 检查配置是否完整
    if (!validateAIConfig.value) {
      return {
        success: false,
        error: '请正确配置AI服务'
      };
    }

    try {
      const messages: AIMessage[] = [];
      // 添加系统提示词和响应格式要求
      if (ac.systemPrompt) {
        messages.push({
          role: 'system',
          content: ac.systemPrompt + '\n\n' + RESPONSE_FORMAT_PROMPT
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
      const response = await callAI(messages);
      const aiResponseContent = response.choices[0]?.message?.content;

      if (!aiResponseContent) {
        console.error('AI服务返回空响应');
        return { success: false, error: 'AI服务返回空响应' };
      }

      // 解析JSON并转换为PetResponseItem[]
      try {
        const parsedResponse = JSON.parse(aiResponseContent);
        if (Array.isArray(parsedResponse)) {
          const validItems: PetResponseItem[] = parsedResponse
            .map(item => {
              return parsePetResponseItemString(item);
            })
            .filter(Boolean) as PetResponseItem[];

          if (validItems.length > 0) {
            // 添加user和AI消息到聊天历史
            chs.addMessage({
              role: 'user',
              content: userMessage
            });
            chs.addMessage({
              role: 'assistant',
              content: aiResponseContent
            });
            return { success: true, data: validItems };
          } else {
            console.error('AI响应格式错误，未返回有效的列表');
            return { success: false, error: 'AI响应格式错误，未返回有效的列表' };
          }
        }
        console.error('AI响应格式错误，未返回有效的列表');
        return { success: false, error: 'AI响应格式错误，未返回有效的列表' };
      } catch (error) {
        console.error('AI响应解析失败:', error);
        return { success: false };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      return {
        success: false,
        error: `对话失败: ${errorMessage}`
      };
    }
  }

  async function testAIConnection(): Promise<{ success: boolean; message: string }> {
    if (!validateAIConfig.value) {
      return { success: false, message: '请正确配置AI服务' };
    }

    try {
      const response = await callAI([
        { role: 'system', content: DEFAULT_CHARACTER_PROMPT },
        { role: 'user', content: '你好' }
      ]);
      if (!response || !response.choices || response.choices.length === 0) {
        return { success: false, message: 'AI服务未返回有效响应' };
      }
      return { success: true, message: '连接成功，AI响应正常' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      return { success: false, message: `连接失败: ${errorMessage}` };
    }
  }

  return {
    validateAIConfig,
    callAI,
    chatWithPet,
    testAIConnection,
  };
}
