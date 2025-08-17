import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PetResponseItem, PetResponseItemWithAudio } from '../types/ai'
import { usePetStateStore } from './petState'
import { useVitsConfigStore } from './vitsConfig'
import { useAIConfigStore } from './aiConfig'
import { getDefaultEmotion, EMOTION_CODE_MAP } from '../constants/emotions'
import { voiceVits } from '../services/chatAndVoice/vitsService'
import { debug } from '@tauri-apps/plugin-log'

// 统一常量
const AUTO_PLAY_DELAY_MS = 2000

export const useConversationStore = defineStore('conversation', () => {
  const responseItems = ref<PetResponseItemWithAudio[]>([])
  const currentMessage = ref('')
  const petState = usePetStateStore()
  const vitsConfig = useVitsConfigStore()
  const aiConfig = useAIConfigStore()

  const isStreaming = ref(false)
  const currentAudio = ref<HTMLAudioElement | null>(null)
  const autoPlayTimerId = ref<number | null>(null)

  function isAutoPlayEnabled(): boolean {
    return aiConfig.autoPlay
  }

  function cancelAutoPlay() {
    if (autoPlayTimerId.value !== null) {
      clearTimeout(autoPlayTimerId.value)
      autoPlayTimerId.value = null
    }
  }

  function scheduleAutoPlay(delay: number = AUTO_PLAY_DELAY_MS) {
    cancelAutoPlay()
    if (!isAutoPlayEnabled()) return
    autoPlayTimerId.value = window.setTimeout(() => {
      autoPlayTimerId.value = null
      if (responseItems.value.length > 0) playNext()
    }, delay)
  }

  function start() {
    isStreaming.value = true
  }

  async function addItem(item: PetResponseItem) {
    const itemWithAudio: PetResponseItemWithAudio = { ...item }
    if (vitsConfig.on && vitsConfig.baseURL && item.japanese) {
      try {
        debug(`正在为日语文本生成语音: ${item.japanese}`)
        const audioBlob = await voiceVits(item.japanese)
        itemWithAudio.audioBlob = audioBlob
        debug('语音生成成功')
      } catch (error) {
        debug(`语音生成失败: ${error}`)
        console.error('VITS语音生成失败:', error)
      }
    }

    responseItems.value.push(itemWithAudio)

    if (!currentMessage.value && responseItems.value.length === 1) {
      playNext()
    } else if (!currentAudio.value && !currentMessage.value && isAutoPlayEnabled()) {
      playNext()
    } else if (
      !currentAudio.value &&
      currentMessage.value &&
      isAutoPlayEnabled() &&
      (!vitsConfig.on || !vitsConfig.baseURL)
    ) {
      scheduleAutoPlay()
    }
  }

  function playNext() {
    const nextItem = responseItems.value.shift()
    if (nextItem) {
      currentMessage.value = nextItem.message
      petState.setPetEmotion(nextItem.emotion)

      if (nextItem.audioBlob) {
        playAudio(nextItem.audioBlob)
      } else {
        if (isAutoPlayEnabled() && (!vitsConfig.on || !vitsConfig.baseURL)) {
          scheduleAutoPlay()
        }
      }
    } else if (isStreaming.value) {
      // 等待更多消息
      console.log('等待更多消息...')
    } else {
      currentMessage.value = ''
      petState.setPetEmotion(EMOTION_CODE_MAP[getDefaultEmotion()])
    }
  }

  function playAudio(audioBlob: Blob) {
    // 停止当前播放的音频
    if (currentAudio.value) {
      currentAudio.value.pause()
      currentAudio.value = null
    }

    const audioUrl = URL.createObjectURL(audioBlob)
    const audio = new Audio(audioUrl)

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl)
      currentAudio.value = null
      if (isAutoPlayEnabled() && responseItems.value.length > 0) {
        playNext()
      }
    }

    audio.onerror = (error) => {
      console.error('音频播放失败:', error)
      URL.revokeObjectURL(audioUrl)
      currentAudio.value = null
      if (isAutoPlayEnabled() && responseItems.value.length > 0) {
        playNext()
      }
    }

    currentAudio.value = audio
    audio.play().catch((error) => {
      console.error('音频播放失败:', error)
      URL.revokeObjectURL(audioUrl)
      currentAudio.value = null
      if (isAutoPlayEnabled() && responseItems.value.length > 0) {
        playNext()
      }
    })
  }

  function finish() {
    isStreaming.value = false
    currentAudio.value = null
    debug('stream结束')
  }

  function clearAll() {
    cancelAutoPlay()
    if (currentAudio.value) {
      currentAudio.value.pause()
      currentAudio.value = null
    }
    responseItems.value = []
  }

  return {
    // state
    isStreaming,
    currentMessage,
    responseItems,
    // actions
    start,
    addItem,
    finish,
    playNext,
    playAudio,
    cancelAutoPlay,
    clearAll,
  }
})
