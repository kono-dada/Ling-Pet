/**
 * @fileoverview 表情相关类型定义
 * @description 定义桌面宠物表情名称和状态的TypeScript类型，提供表情管理的类型安全
 * @types
 *   - EmotionName: 表情文件名联合类型 (19种表情)
 *   - EmotionState: 表情状态接口 (当前表情、抖动状态)
 * @emotions
 *   正常、高兴、伤心、生气、害怕、惊讶、厌恶、害羞、兴奋、担心、
 *   调皮、慌张、紧张、认真、无奈、心动、羞耻、自信、疑惑
 * @usage
 *   import type { EmotionName, EmotionState } from '@/types/emotion'
 * @author dada
 * @version 1.0.0
 * @since 2025-07-13
 */

// 表情相关类型定义
export type EmotionName = 
  | "正常" | "高兴" | "伤心" | "生气" | "害怕"
  | "惊讶" | "厌恶" | "羞愤" | "兴奋" | "担心"
  | "调皮" | "慌张" | "紧张" | "认真" | "无奈"
  | "心动" | "羞耻" | "自信" | "疑惑";

export interface EmotionState {
  currentEmotion: EmotionName;
  isShaking: boolean;
}
