import { useAIConfigStore } from '../stores/aiConfig';
import { useChatHistoryStore } from '../stores/chatHistory';
import { computed } from 'vue';
import type { AIMessage, PetResponseItem } from '../types/ai';
import { DEFAULT_CHARACTER_PROMPT, RESPONSE_FORMAT_PROMPT, USER_PROMPT_WRAPPER } from '../constants/ai';
import { EMOTIONS } from '../constants/emotions';
import { EmotionName } from '../types/emotion';
import type { ChatCompletion } from 'openai/resources';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { OpenAI } from 'openai';
import { debug } from '@tauri-apps/plugin-log';

export function useAIService() {
  const ac = useAIConfigStore();
  const chs = useChatHistoryStore();
  const validateAIConfig = computed(() => Boolean(ac.apiKey && ac.baseURL && ac.model));

  async function callAI(messages: AIMessage[]): Promise<ChatCompletion> {
    const client = new OpenAI({
      apiKey: ac.apiKey,
      baseURL: ac.baseURL,
      fetch: tauriFetch, // 使用 Tauri 的 fetch，防止CORS问题
      dangerouslyAllowBrowser: true, // 允许浏览器环境
    });

    console.log('调用AI服务，消息:', messages);
    const completion = await client.chat.completions.create({
      model: ac.model,
      messages: messages,
      temperature: ac.temperature,
      max_tokens: ac.maxTokens,
    });
    console.log('AI服务响应:', completion);

    return completion;
  }

  // 流式对话，无需等待全部生成就能产生聊天气泡
  async function callAIStream(
    messages: AIMessage[],
    onItemComplete: (item: PetResponseItem) => Promise<void>
  ): Promise<{
    response: string;
    error?: string;
    success: boolean;
  }> {
    const client = new OpenAI({
      apiKey: ac.apiKey,
      baseURL: ac.baseURL,
      fetch: tauriFetch,
      dangerouslyAllowBrowser: true,
    });
    let total = '';

    try {
      console.log('调用AI流式服务，消息:', messages);
      const stream = await client.chat.completions.create({
        model: ac.model,
        messages: messages,
        temperature: ac.temperature,
        max_tokens: ac.maxTokens,
        stream: true,
      });

      let buffer = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        total += content;
        buffer += content;

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

        // 移除已处理的完整 item 标签
        buffer = buffer.replace(/<item>.*?<\/item>/g, '');
      }

      debug('AI流式服务完成');
      return { response: total, success: true };
    } catch (error: any) {
      debug('AI流式服务错误:', error);
      return { response: total, error: error instanceof Error ? error.message : '未知错误', success: false };
    }
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

  async function chatWithPetStream(
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

    // 添加user消息到聊天历史
    chs.addMessage({
      role: 'user',
      content: userMessage
    });

    const result = await callAIStream(messages, onItemComplete);

    chs.addMessage({
      role: 'assistant',
      content: result.response // 将流式响应内容作为AI的回复
    });

    chs.$tauri.save();

    return { success: result.success, error: result.error };
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
      console.log('测试AI连接失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      return { success: false, message: `连接失败: ${errorMessage}` };
    }
  }

  return {
    callAI,
    chatWithPetStream,
    testAIConnection,
  };
}
