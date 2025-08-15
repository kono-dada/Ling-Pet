/**
 * @fileoverview 表情颜色主题常量
 * @description 定义每种表情对应的气泡颜色主题，用于营造不同的情感氛围
 * @author dada
 * @version 1.0.0
 * @since 2025-07-13
 */

import type { EmotionName } from '../types/emotion';
import { getEmotionColorThemeByName, type ColorTheme } from '../services/emotionPack'

export function getEmotionColorTheme(emotion: EmotionName): ColorTheme {
  return getEmotionColorThemeByName(emotion)
}
