import { defineStore } from 'pinia'
import { ref } from 'vue'
import { EmotionName, isEmotionName } from '../types/emotion'
import { DEFAULT_EMOTION } from '../constants/emotions';
import { debug } from '@tauri-apps/plugin-log';

export const usePetStateStore = defineStore('state', {
  state: () => ({
    currentEmotion: ref<EmotionName>(DEFAULT_EMOTION), // 默认情绪
  }),
  actions: {
    setPetEmotion(emotion: string) {
      // 验证情绪是否有效
      if (isEmotionName(emotion)) {
        this.currentEmotion = emotion as EmotionName;
      } else {
        debug(`无效的情绪名称: ${emotion}`);
        this.currentEmotion = DEFAULT_EMOTION; // 设置为默认情绪
      }
    },
  },
});