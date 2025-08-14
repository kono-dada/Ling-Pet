import { EmotionName } from '../types/emotion';

// 情绪固定顺序列表，用于分配稳定的编号（0-based）
export const EMOTIONS: EmotionName[] = [
	EmotionName.正常,
	EmotionName.高兴,
	EmotionName.伤心,
	EmotionName.生气,
	EmotionName.害怕,
	EmotionName.惊讶,
	EmotionName.厌恶,
	EmotionName.羞愤,
	EmotionName.微笑,
	EmotionName.担心,
	EmotionName.调皮,
	EmotionName.慌张,
	EmotionName.紧张,
	EmotionName.认真,
	EmotionName.无奈,
	EmotionName.心动,
	EmotionName.羞耻,
	EmotionName.自信,
	EmotionName.疑惑,
];

export const DEFAULT_EMOTION: EmotionName = EmotionName.正常;

// 名称 -> 编号
export const EMOTION_CODE_MAP: Record<EmotionName, number> = EMOTIONS
	.reduce((acc, name, idx) => { acc[name] = idx; return acc; }, {} as Record<EmotionName, number>);

// 编号 -> 名称（索引访问）
export const CODE_TO_EMOTION = EMOTIONS;

// 获取情绪编号（不存在则返回默认的编号0）
export function emotionNameToCode(name: EmotionName): number {
	return EMOTION_CODE_MAP[name] ?? 0;
}

// 从编号解析为情绪名称（越界时回退为默认情绪）
export function codeToEmotion(code: number): EmotionName {
	if (Number.isInteger(code) && code >= 0 && code < CODE_TO_EMOTION.length) {
		return CODE_TO_EMOTION[code];
	}
	return DEFAULT_EMOTION;
}

// 供提示词使用的“名称：编号”清单
export function getEmotionCodePrompt(): string {
	return CODE_TO_EMOTION.map((name, idx) => `${name}：${idx}`).join('\n');
}
