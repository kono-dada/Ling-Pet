import { EmotionName } from "./emotion";
import type { ChatCompletionMessageParam, ChatCompletionCreateParams } from 'openai/resources/chat/completions';

// 使用 OpenAI SDK 的官方类型
export type AIMessage = ChatCompletionMessageParam;
export type ChatRequest = ChatCompletionCreateParams;

// 桌宠对话相关类型
export interface PetResponseItem {
  message: string;
  emotion: EmotionName;
  japanese: string;
}
