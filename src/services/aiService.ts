import { useAIConfigStore } from '../stores/aiConfig';
import { computed } from 'vue';
import type { AIMessage } from '../types/ai';
import { DEFAULT_CHARACTER_PROMPT } from '../constants/ai';
import type { ChatCompletion } from 'openai/resources';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { OpenAI } from 'openai';

export function useAIService() {
  const ac = useAIConfigStore();
  const validateAIConfig = computed(() => Boolean(ac.apiKey && ac.baseURL && ac.model));

  function createNewClient() {
    return new OpenAI({
      apiKey: ac.apiKey,
      baseURL: ac.baseURL,
      fetch: tauriFetch, // 使用 Tauri 的 fetch，防止CORS问题
      dangerouslyAllowBrowser: true, // 允许浏览器环境
    });
  }

  async function callAI(messages: AIMessage[]): Promise<ChatCompletion> {
    const client = createNewClient();

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

  // 流式对话，通用的流式处理函数
  async function callAIStream(
    messages: AIMessage[],
    onChunk: (chunk: string, buffer: string) => Promise<string>
  ): Promise<{
    response: string;
    error?: string;
    success: boolean;
  }> {
    const client = createNewClient();
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

        // 调用回调函数处理chunk，返回处理后的buffer
        buffer = await onChunk(content, buffer);
      }

      return { response: total, success: true };
    } catch (error: any) {
      return { response: total, error: error instanceof Error ? error.message : '未知错误', success: false };
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
      console.log('测试AI连接失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      return { success: false, message: `连接失败: ${errorMessage}` };
    }
  }

  return {
    callAI,
    callAIStream,
    testAIConnection,
  };
}
