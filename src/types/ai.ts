/**
 * @fileoverview AI相关类型定义
 * @description 定义AI聊天功能相关的TypeScript类型接口，包括消息格式、配置、响应等
 * @interfaces
 *   - AIMessage: AI消息接口 (角色、内容)
 *   - AIResponse: AI API响应格式 (标准OpenAI格式)
 *   - AIConfig: AI配置接口 (API Key、模型、参数等)
 *   - ChatRequest: 聊天请求格式
 *   - PetResponse: 宠物响应格式 (包含建议表情和动画)
 *   - ConversationContext: 对话上下文管理
 * @usage
 *   import type { AIConfig, AIMessage, PetResponse } from '@/types/ai'
 * @author dada
 * @version 1.0.0
 * @since 2025-07-13
 */

// AI 相关类型定义

import { EmotionName } from "./emotion";

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
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

export interface ConversationContext {
  messages: AIMessage[];
  petPersonality: string;
  currentEmotion: string;
}
