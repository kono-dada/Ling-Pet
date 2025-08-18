import { useAIConfigStore } from '../../stores/aiConfig';
import type { AIMessage } from '../../types/ai';
import { DEFAULT_CHARACTER_PROMPT } from '../../constants/ai';
import type { ChatCompletion } from 'openai/resources';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { OpenAI } from 'openai';
import type { ChunkHandler } from './chunkHandlers';
import { createMultiChunkHandler } from './chunkHandlers';

function createNewClient() {
  const ac = useAIConfigStore();
  return new OpenAI({
    apiKey: ac.apiKey,
    baseURL: ac.baseURL,
    fetch: tauriFetch, // 使用 Tauri 的 fetch，防止CORS问题
    dangerouslyAllowBrowser: true, // 允许浏览器环境
  });
}

export async function callAI(messages: AIMessage[]): Promise<ChatCompletion> {
  const ac = useAIConfigStore();
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
export async function callAIStream(
  messages: AIMessage[],
  onChunks: ChunkHandler[]
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
      model: useAIConfigStore().model,
      messages: messages,
      temperature: useAIConfigStore().temperature,
      max_tokens: useAIConfigStore().maxTokens,
      stream: true,
      stream_options: { include_usage: true }
    });

    let buffer = '';
    let usage;
    const handler: ChunkHandler = createMultiChunkHandler(onChunks);

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      total += content;
      buffer += content;
      if (chunk.usage) usage = chunk.usage;

      // 顺序执行 handlers，逐个接收上一个返回的 buffer
      buffer = await handler(buffer);
    }
    console.log('流式处理完成，累计tokens:', usage?.completion_tokens);
    console.log('流式处理完成，累计prompt tokens:', usage?.prompt_tokens);

    return { response: total, success: true };
  } catch (error: any) {
    console.error('流式处理错误:', error);
    return { response: total, error: error instanceof Error ? error.message : '未知错误', success: false };
  }
}

export async function testAIConnection(): Promise<{ success: boolean; message: string }> {
  const ac = useAIConfigStore();
  const hasConfig = Boolean(ac.apiKey && ac.baseURL && ac.model)
  if (!hasConfig) {
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
