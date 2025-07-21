/**
 * @fileoverview 表情相关常量定义
 * @description 定义桌面宠物所有可用表情和默认表情，提供类型安全的表情管理
 * @constants
 *   - EMOTIONS: 所有可用表情的文件名数组
 *   - DEFAULT_EMOTION: 默认表情 ("正常")
 * @emotionList
 *   正常、高兴、伤心、生气、害怕、惊讶、厌恶、害羞、兴奋、担心、
 *   调皮、慌张、紧张、认真、无奈、心动、羞耻、自信、疑惑
 * @usage
 *   import { EMOTIONS, DEFAULT_EMOTION } from '@/constants/emotions'
 * @author dada
 * @version 1.0.0
 * @since 2025-07-13
 */

// 表情常量
import type { EmotionName } from '../types/emotion';

export const EMOTIONS: EmotionName[] = [
  "正常", "高兴", "伤心", "生气", "害怕", 
  "惊讶", "厌恶", "羞愤", "兴奋", "担心",
  "调皮", "慌张", "紧张", "认真", "无奈",
  "心动", "羞耻", "自信", "疑惑"
];

export const DEFAULT_EMOTION: EmotionName = "正常";
