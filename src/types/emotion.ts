// 动态表情系统：名称使用字符串，编号使用数字
export type EmotionName = string;

export interface EmotionState {
  currentEmotion: number; // 使用编号
  isShaking: boolean;
}

// 颜色主题（表情相关 UI 用）
export interface ColorTheme {
  background: string
  border: string
  text: string
  shadow: string
}

