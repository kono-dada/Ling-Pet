import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DEFAULT_EMOTION, EMOTION_CODE_MAP } from '../constants/emotions';
import { debug } from '@tauri-apps/plugin-log';

export const usePetStateStore = defineStore('state', {
  state: () => ({
  // 仅保存情绪编号
  currentEmotion: ref<number>(EMOTION_CODE_MAP[DEFAULT_EMOTION]), // 默认情绪编号
    lastClickTimestamp: ref<number>(Date.now()), // 上次点击时间戳
  }),
  actions: {
    setPetEmotion(emotionCode: number) {
      if (Number.isInteger(emotionCode) && emotionCode >= 0) {
        this.currentEmotion = emotionCode;
      } else {
        debug(`无效的情绪编号: ${emotionCode}`);
        this.currentEmotion = EMOTION_CODE_MAP[DEFAULT_EMOTION];
      }
    },
    updateLastClickTimestamp() {
      this.lastClickTimestamp = Date.now();
    },
  },
  getters: {
    millisecondsSinceLastClick(): number {
      return Date.now() - this.lastClickTimestamp;
    }
  }
});