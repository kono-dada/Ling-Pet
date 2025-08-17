import type { ChatCompletionMessageParam, ChatCompletionCreateParams } from 'openai/resources/chat/completions';

// 使用 OpenAI SDK 的官方类型
export type AIMessage = ChatCompletionMessageParam;
export type ChatRequest = ChatCompletionCreateParams;

// 桌宠对话相关类型
export interface PetResponseItem {
  message: string;
  emotion: number;
  japanese: string;
}

// 扩展：带可选音频的响应项（排队/播放用）
export interface PetResponseItemWithAudio extends PetResponseItem {
  audioBlob?: Blob;
}
