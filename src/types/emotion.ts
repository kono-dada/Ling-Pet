// 表情相关类型定义
export type EmotionName =
  | "正常" | "高兴" | "伤心" | "生气" | "害怕"
  | "惊讶" | "厌恶" | "羞愤" | "微笑" | "担心"
  | "调皮" | "慌张" | "紧张" | "认真" | "无奈"
  | "心动" | "羞耻" | "自信" | "疑惑" | "啊嘿颜" | "欲求不满";
// 检查字符串是否为有效的 EmotionName
export function isEmotionName(str: string): str is EmotionName {
  return [
    "正常", "高兴", "伤心", "生气", "害怕",
    "惊讶", "厌恶", "羞愤", "微笑", "担心",
    "调皮", "慌张", "紧张", "认真", "无奈",
    "心动", "羞耻", "自信", "疑惑", "啊嘿颜", "欲求不满"
  ].includes(str);
}

export interface EmotionState {
  currentEmotion: EmotionName;
  isShaking: boolean;
}
