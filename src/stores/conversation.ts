import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PetResponseItem, PetResponseItemWithAudio } from '../types/ai'
import { usePetStateStore } from './petState'
import { useVitsConfigStore } from './vitsConfig'
import { useAIConfigStore } from './aiConfig'
import { getDefaultEmotion, EMOTION_CODE_MAP } from '../constants/emotions'
import { voiceVits } from '../services/chatAndVoice/vitsService'
import { debug } from '@tauri-apps/plugin-log'

// 策略常量（可后续抽到配置）
const POST_DELAY_MS = 2000 // 非流式期文字推进延迟
const STREAM_IMMEDIATE = true // 流式期立即推进
const INACTIVITY_TIMEOUT_MS = 15000 // 超过该时间无推进则进入空闲策略

export const useConversationStore = defineStore('conversation', () => {
  const responseItems = ref<PetResponseItemWithAudio[]>([])
  const currentMessage = ref('')
  const petState = usePetStateStore()
  const vitsConfig = useVitsConfigStore()
  const aiConfig = useAIConfigStore()

  const isStreaming = ref(false)
  const currentAudio = ref<HTMLAudioElement | null>(null)
  const autoPlayTimerId = ref<number | null>(null)
  const inactivityTimerId = ref<number | null>(null)
  const lastActivityAt = ref<number>(Date.now())
  const abortAfterStream = ref(false)

  function isAutoPlayEnabled(): boolean {
    return aiConfig.autoPlay
  }

  function cancelAutoPlay() {
    if (autoPlayTimerId.value !== null) {
      clearTimeout(autoPlayTimerId.value)
      autoPlayTimerId.value = null
    }
  }

  function scheduleNext(delay: number = POST_DELAY_MS) {
    cancelAutoPlay()
    if (!isAutoPlayEnabled()) return
    autoPlayTimerId.value = window.setTimeout(() => {
      autoPlayTimerId.value = null
      if (responseItems.value.length > 0) playNext()
    }, delay)
  }

  // 统一的推进入口：根据 currentAudio/isStreaming 决定立即或延迟推进
  function maybeConsume() {
    // 1) 正在播音频：等待 onended 再推进
    if (currentAudio.value) return

    // 2) 展示位为空且有队列：立即播放下一条
    if (!currentMessage.value && responseItems.value.length > 0) {
      playNext()
      return
    }

    // 3) 展示位非空：根据流式/非流式策略推进
    if (responseItems.value.length > 0 && isAutoPlayEnabled()) {
      if (isStreaming.value && STREAM_IMMEDIATE) {
        playNext()
      } else {
        scheduleNext(POST_DELAY_MS)
      }
    }
  }

  function start() {
    isStreaming.value = true
    abortAfterStream.value = false
    touchActivity()
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
    // 统一推进入口，避免分叉条件
    maybeConsume()
  }

  function playNext() {
    cancelAutoPlay()
    const nextItem = responseItems.value.shift()
    if (nextItem) {
      currentMessage.value = nextItem.message
      petState.setPetEmotion(nextItem.emotion)
      touchActivity()

      if (nextItem.audioBlob) {
        playAudio(nextItem.audioBlob)
      } else {
        // 无音频：交由 maybeConsume 决定立即/延时推进
        maybeConsume()
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
    // 播放开始视为活跃
    touchActivity()

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl)
      currentAudio.value = null
      // 音频结束后尝试推进
      maybeConsume()
    }

    audio.onerror = (error) => {
      console.error('音频播放失败:', error)
      URL.revokeObjectURL(audioUrl)
      currentAudio.value = null
      // 出错后也尝试推进
      maybeConsume()
    }

    currentAudio.value = audio
    audio.play().catch((error) => {
      console.error('音频播放失败:', error)
      URL.revokeObjectURL(audioUrl)
      currentAudio.value = null
      // 播放失败后尝试推进
      maybeConsume()
    })
  }

  function finish() {
    isStreaming.value = false
    currentAudio.value = null
    debug('stream结束')
    // 若已触发空闲策略且要求在流式结束后清空，则执行停止到空闲
    if (abortAfterStream.value) {
      stopToIdle()
    }
  }

  function clearAll() {
    cancelAutoPlay()
    if (currentAudio.value) {
      currentAudio.value.pause()
      currentAudio.value = null
    }
    responseItems.value = []
  }

  function stopToIdle() {
    cancelAutoPlay()
    if (currentAudio.value) {
      currentAudio.value.pause()
      currentAudio.value = null
    }
    responseItems.value = []
    currentMessage.value = ''
    petState.setPetEmotion(EMOTION_CODE_MAP[getDefaultEmotion()])
    isStreaming.value = false
    abortAfterStream.value = false
    touchActivity() // 重置活跃计时
  }

  function cancelInactivityWatch() {
    if (inactivityTimerId.value !== null) {
      clearTimeout(inactivityTimerId.value)
      inactivityTimerId.value = null
    }
  }

  function scheduleInactivityWatch() {
    cancelInactivityWatch()
    inactivityTimerId.value = window.setTimeout(() => {
      inactivityTimerId.value = null
      const now = Date.now()
      const elapsed = now - lastActivityAt.value
      if (elapsed < INACTIVITY_TIMEOUT_MS) {
        // 有新活动，重新监听
        scheduleInactivityWatch()
        return
      }
      // 若此刻仍在播音频，则延后检查
      if (currentAudio.value) {
        scheduleInactivityWatch()
        return
      }
      // 超时：流式中则等待结束后清空；非流式立即清空回空闲
      if (isStreaming.value) {
        abortAfterStream.value = true
        // 等待 finish() 触发 stopToIdle()
      } else {
        stopToIdle()
      }
    }, INACTIVITY_TIMEOUT_MS)
  }

  function touchActivity() {
    lastActivityAt.value = Date.now()
    scheduleInactivityWatch()
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
    stopToIdle,
  }
})
