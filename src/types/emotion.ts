// 表情相关类型定义
export enum EmotionName {
  正常 = "正常",
  高兴 = "高兴", 
  伤心 = "伤心",
  生气 = "生气",
  害怕 = "害怕",
  惊讶 = "惊讶",
  厌恶 = "厌恶",
  羞愤 = "羞愤",
  微笑 = "微笑",
  担心 = "担心",
  调皮 = "调皮",
  慌张 = "慌张",
  紧张 = "紧张",
  认真 = "认真",
  无奈 = "无奈",
  心动 = "心动",
  羞耻 = "羞耻",
  自信 = "自信",
  疑惑 = "疑惑",
}

// 检查字符串是否为有效的 EmotionName
export function isEmotionName(str: string): str is EmotionName {
  return Object.values(EmotionName).includes(str as EmotionName);
}

export interface EmotionState {
  currentEmotion: EmotionName;
  isShaking: boolean;
}
