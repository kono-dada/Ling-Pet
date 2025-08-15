import type { EmotionName } from '../types/emotion';
import {
	codeToEmotion as _codeToEmotion,
	emotionNameToCode as _emotionNameToCode,
	getEmotionCodePrompt as _getEmotionCodePrompt,
	getDefaultEmotionName,
} from '../services/emotionPack'

export function getDefaultEmotion(): EmotionName { return getDefaultEmotionName() }

export function emotionNameToCode(name: EmotionName): number { return _emotionNameToCode(name) }
export function codeToEmotion(code: number): EmotionName { return _codeToEmotion(code) }
export function getEmotionCodePrompt(): string { return _getEmotionCodePrompt() }

// 为兼容旧代码：动态构造映射（只读代理）
export const EMOTION_CODE_MAP: Record<EmotionName, number> = new Proxy({}, {
	get(_t, p: string) { return _emotionNameToCode(p as EmotionName) },
}) as Record<EmotionName, number>

export const CODE_TO_EMOTION = new Proxy([] as EmotionName[], {
	get(_t, p: string | symbol) {
		if (typeof p === 'string' && /^\d+$/.test(p)) return _codeToEmotion(Number(p))
		return undefined as any
	}
}) as unknown as EmotionName[]
