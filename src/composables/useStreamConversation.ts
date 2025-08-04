import { PetResponseItem } from "../types/ai";
import { useChatBubbleStateStore, PetResponseItemWithAudio } from "../stores/chatBubbleState";
import { usePetStateStore } from "../stores/petState";
import { useVitsConfigStore } from "../stores/vitsConfig";
import { DEFAULT_EMOTION } from "../constants/emotions";
import { voiceVits } from "../services/vitsService";
import { debug } from "@tauri-apps/plugin-log";
import { ref } from "vue";

export function useStreamConversation() {
  const cbs = useChatBubbleStateStore();
  const petState = usePetStateStore();
  const vitsConfig = useVitsConfigStore();
  const isStreaming = ref(false);
  const currentAudio = ref<HTMLAudioElement | null>(null);

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
    // 如果当前没有显示消息且队列中只有这一条消息，立即播放
    if (!cbs.currentMessage && cbs.responseItems.length === 1) {
      playNext();
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
      }
    } else if (isStreaming.value) {
      // 如果还在流式接收但没有下一句，等待
      console.log('等待更多消息...');
    } else {
      cbs.setCurrentMessage('');
      petState.setPetEmotion(DEFAULT_EMOTION);
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
    };

    audio.onerror = (error) => {
      console.error('音频播放失败:', error);
      URL.revokeObjectURL(audioUrl);
      currentAudio.value = null;
    };

    currentAudio.value = audio;
    audio.play().catch(error => {
      console.error('音频播放失败:', error);
      URL.revokeObjectURL(audioUrl);
      currentAudio.value = null;
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
  };
}
