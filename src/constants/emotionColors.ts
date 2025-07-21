/**
 * @fileoverview 表情颜色主题常量
 * @description 定义每种表情对应的气泡颜色主题，用于营造不同的情感氛围
 * @author dada
 * @version 1.0.0
 * @since 2025-07-13
 */

import type { EmotionName } from '../types/emotion';

// 颜色主题接口
export interface ColorTheme {
  background: string;
  border: string;
  text: string;
  shadow: string;
}

// 表情颜色主题映射
export const EMOTION_COLOR_THEMES: Record<EmotionName, ColorTheme> = {
  // 中性情绪 - 淡蓝白色
  "正常": {
    background: "rgba(248, 250, 252, 0.98)",
    border: "rgba(203, 213, 225, 0.6)",
    text: "#334155",
    shadow: "rgba(100, 116, 139, 0.15)"
  },

  // 积极情绪 - 暖色调
  "高兴": {
    background: "rgba(254, 249, 195, 0.98)",
    border: "rgba(252, 211, 77, 0.6)",
    text: "#92400e",
    shadow: "rgba(245, 158, 11, 0.2)"
  },
  "兴奋": {
    background: "rgba(255, 237, 213, 0.98)",
    border: "rgba(251, 146, 60, 0.6)",
    text: "#c2410c",
    shadow: "rgba(249, 115, 22, 0.2)"
  },
  "心动": {
    background: "rgba(252, 231, 243, 0.98)",
    border: "rgba(244, 114, 182, 0.6)",
    text: "#be185d",
    shadow: "rgba(236, 72, 153, 0.2)"
  },
  "调皮": {
    background: "rgba(240, 253, 244, 0.98)",
    border: "rgba(34, 197, 94, 0.6)",
    text: "#166534",
    shadow: "rgba(34, 197, 94, 0.15)"
  },
  "自信": {
    background: "rgba(237, 233, 254, 0.98)",
    border: "rgba(147, 51, 234, 0.6)",
    text: "#6b21a8",
    shadow: "rgba(147, 51, 234, 0.15)"
  },

  // 消极情绪 - 冷色调
  "伤心": {
    background: "rgba(239, 246, 255, 0.98)",
    border: "rgba(59, 130, 246, 0.6)",
    text: "#1e40af",
    shadow: "rgba(59, 130, 246, 0.15)"
  },
  "生气": {
    background: "rgba(254, 242, 242, 0.98)",
    border: "rgba(239, 68, 68, 0.6)",
    text: "#dc2626",
    shadow: "rgba(239, 68, 68, 0.2)"
  },
  "害怕": {
    background: "rgba(247, 247, 247, 0.98)",
    border: "rgba(115, 115, 115, 0.6)",
    text: "#525252",
    shadow: "rgba(115, 115, 115, 0.15)"
  },
  "担心": {
    background: "rgba(245, 245, 244, 0.98)",
    border: "rgba(168, 162, 158, 0.6)",
    text: "#78716c",
    shadow: "rgba(168, 162, 158, 0.15)"
  },
  "无奈": {
    background: "rgba(250, 250, 249, 0.98)",
    border: "rgba(214, 211, 209, 0.6)",
    text: "#a8a29e",
    shadow: "rgba(214, 211, 209, 0.15)"
  },

  // 惊讶情绪 - 亮色调
  "惊讶": {
    background: "rgba(255, 251, 235, 0.98)",
    border: "rgba(245, 158, 11, 0.6)",
    text: "#d97706",
    shadow: "rgba(245, 158, 11, 0.2)"
  },
  "疑惑": {
    background: "rgba(248, 250, 252, 0.98)",
    border: "rgba(148, 163, 184, 0.6)",
    text: "#64748b",
    shadow: "rgba(148, 163, 184, 0.15)"
  },

  // 紧张情绪 - 橙红色调
  "慌张": {
    background: "rgba(255, 247, 237, 0.98)",
    border: "rgba(251, 146, 60, 0.6)",
    text: "#ea580c",
    shadow: "rgba(251, 146, 60, 0.2)"
  },
  "紧张": {
    background: "rgba(254, 243, 199, 0.98)",
    border: "rgba(245, 158, 11, 0.6)",
    text: "#b45309",
    shadow: "rgba(245, 158, 11, 0.18)"
  },

  // 羞涩情绪 - 粉色调
  "羞愤": {
    background: "rgba(253, 244, 255, 0.98)",
    border: "rgba(196, 181, 253, 0.6)",
    text: "#7c3aed",
    shadow: "rgba(196, 181, 253, 0.15)"
  },
  "羞耻": {
    background: "rgba(254, 244, 255, 0.98)",
    border: "rgba(217, 70, 239, 0.6)",
    text: "#a21caf",
    shadow: "rgba(217, 70, 239, 0.15)"
  },

  // 其他情绪
  "厌恶": {
    background: "rgba(240, 253, 244, 0.98)",
    border: "rgba(34, 197, 94, 0.6)",
    text: "#15803d",
    shadow: "rgba(34, 197, 94, 0.15)"
  },
  "认真": {
    background: "rgba(241, 245, 249, 0.98)",
    border: "rgba(100, 116, 139, 0.6)",
    text: "#475569",
    shadow: "rgba(100, 116, 139, 0.15)"
  },
};

// 获取表情对应的颜色主题
export function getEmotionColorTheme(emotion: EmotionName): ColorTheme {
  return EMOTION_COLOR_THEMES[emotion] || EMOTION_COLOR_THEMES["正常"];
}
