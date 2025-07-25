import { EmotionName } from "./emotion";

export type AIMessageContent = string | Array<{
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'low' | 'medium' | 'high';
  };
}>;

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: AIMessageContent;
}

export interface AIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: AIMessage;
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AIConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

export interface ChatRequest {
  messages: AIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

// 桌宠对话相关类型
export interface PetResponseItem {
  message: string;
  emotion: EmotionName;
  japanese: string;
}

export interface PetResponse {
  success: boolean;
  data?: PetResponseItem[];
  error?: string;
}
