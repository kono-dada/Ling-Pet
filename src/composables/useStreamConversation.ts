import { PetResponseItem } from "../types/ai";
import { useChatBubbleStateStore, PetResponseItemWithAudio } from "../stores/chatBubbleState";
import { usePetStateStore } from "../stores/petState";
import { useVitsConfigStore } from "../stores/vitsConfig";
import { useAIConfigStore } from "../stores/aiConfig";
import { getDefaultEmotion, EMOTION_CODE_MAP } from "../constants/emotions";
import { voiceVits } from "../services/chatAndVoice/vitsService";
import { debug } from "@tauri-apps/plugin-log";
import { ref } from "vue";

// AutoPlayManager接口定义
interface AutoPlayManager {
  timeoutId: number | null;
  isEnabled: () => boolean;
  scheduleNext: (delay?: number) => void;
  cancel: () => void;
  cleanup: () => void;
}

export function useStreamConversation() {
  const cbs = useChatBubbleStateStore();
  const petState = usePetStateStore();
  const vitsConfig = useVitsConfigStore();
  const aiConfig = useAIConfigStore();
  const isStreaming = ref(false);
  const currentAudio = ref<HTMLAudioElement | null>(null);
  const delay = 2000;

  // 自动播放管理器实现
  const autoPlayManager: AutoPlayManager = {
    timeoutId: null,

    // 检查自动播放是否启用
    isEnabled(): boolean {
      return aiConfig.autoPlay;
    },

    // 调度延迟播放下一句
    scheduleNext(delay: number = 2000): void {
      // 取消现有的定时器
      this.cancel();

      // 只有在自动播放启用时才设置新的定时器
      if (this.isEnabled()) {
        this.timeoutId = window.setTimeout(() => {
          this.timeoutId = null;
          // 检查是否还有下一句话需要播放
          if (cbs.responseItems.length > 0) {
            playNext();
          }
        }, delay);
      }
    },

    // 取消当前的自动播放定时器
    cancel(): void {
      if (this.timeoutId !== null) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
    },

    // 清理所有资源
    cleanup(): void {
      this.cancel();
    }
  };

  // 开始流式对话
  function startStreaming() {
    isStreaming.value = true;
  }

  // 添加新的消息项（当AI流式返回完整item时调用）
  async function addStreamItem(item: PetResponseItem) {
    const itemWithAudio: PetResponseItemWithAudio = { ...item };

    // 如果启用了VITS且有日语文本，则生成语音
    if (vitsConfig.on && vitsConfig.baseURL && item.japanese) {
      try {
        debug(`正在为日语文本生成语音: ${item.japanese}`);
        const audioBlob = await voiceVits(item.japanese);
        itemWithAudio.audioBlob = audioBlob;
        debug('语音生成成功');
      } catch (error) {
        debug(`语音生成失败: ${error}`);
        console.error('VITS语音生成失败:', error);
      }
    }

    cbs.addItem(itemWithAudio);

    // 自动播放逻辑：
    // 1. 如果当前没有显示消息且队列中只有这一条消息，立即播放
    // 2. 如果当前没有音频播放且没有显示消息，且自动播放开启，也立即播放
    // 3. 如果当前没有音频播放且有显示消息，但自动播放开启且没有语音，则延迟播放
    if (!cbs.currentMessage && cbs.responseItems.length === 1) {
      playNext();
    } else if (!currentAudio.value && !cbs.currentMessage && autoPlayManager.isEnabled()) {
      // 当前没有音频播放，没有显示消息，且自动播放开启时，立即播放
      playNext();
    } else if (!currentAudio.value && cbs.currentMessage && autoPlayManager.isEnabled() && (!vitsConfig.on || !vitsConfig.baseURL)) {
      // 当前没有音频播放，有显示消息，自动播放开启，且没有语音服务时，延迟播放
      autoPlayManager.scheduleNext(delay);
    }
  }

  // 播放下一句话
  function playNext() {
    const nextItem = cbs.shiftNext();

    if (nextItem) {
      cbs.setCurrentMessage(nextItem.message);
      petState.setPetEmotion(nextItem.emotion);

      // 播放语音（如果有）
      if (nextItem.audioBlob) {
        playAudio(nextItem.audioBlob);
      } else {
        // 文字模式下的延迟自动播放逻辑
        // 当没有语音且自动播放开启时，设置1秒延迟定时器
        if (autoPlayManager.isEnabled() && (!vitsConfig.on || !vitsConfig.baseURL)) {
          // 在定时器到期时检查队列并播放下一句
          // 确保定时器能够被正确取消和清理
          autoPlayManager.scheduleNext(delay);
        }
      }
    } else if (isStreaming.value) {
      // 如果还在流式接收但没有下一句，等待
      console.log('等待更多消息...');
    } else {
      cbs.setCurrentMessage('');
      petState.setPetEmotion(EMOTION_CODE_MAP[getDefaultEmotion()]);
    }
  }

  // 播放音频
  function playAudio(audioBlob: Blob) {
    // 停止当前播放的音频
    if (currentAudio.value) {
      currentAudio.value.pause();
      currentAudio.value = null;
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudio.value = null;

      // 语音播放结束后的自动播放逻辑
      // 检查自动播放设置和队列状态
      if (autoPlayManager.isEnabled() && cbs.responseItems.length > 0) {
        // 当条件满足时自动调用playNext函数
        // 确保只在有下一句话时才触发自动播放
        playNext();
      }
    };

    audio.onerror = (error) => {
      console.error('音频播放失败:', error);
      URL.revokeObjectURL(audioUrl);
      currentAudio.value = null;

      // 音频播放错误时也检查自动播放逻辑
      if (autoPlayManager.isEnabled() && cbs.responseItems.length > 0) {
        playNext();
      }
    };

    currentAudio.value = audio;
    audio.play().catch(error => {
      console.error('音频播放失败:', error);
      URL.revokeObjectURL(audioUrl);
      currentAudio.value = null;

      // 音频播放失败时也检查自动播放逻辑
      if (autoPlayManager.isEnabled() && cbs.responseItems.length > 0) {
        playNext();
      }
    });
  }

  // 结束对话
  function finishStreaming() {
    isStreaming.value = false;
    currentAudio.value = null;
    debug('stream结束');
  }

  return {
    isStreaming,
    startStreaming,
    addStreamItem,
    finishStreaming,
    playNext,
    playAudio,
    autoPlayManager,
  };
}
