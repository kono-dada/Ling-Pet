import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { PetResponseItem, PetResponseItemWithAudio } from '../types/ai'
import { usePetStateStore } from './petState'
import { useVitsConfigStore } from './configs/vitsConfig'
import { useAIConfigStore } from './configs/aiConfig'
import { getDefaultEmotionCode } from '../constants/emotions'
import { voiceVits } from '../services/chatAndVoice/vitsService'
import { debug } from '@tauri-apps/plugin-log'

// 策略常量（可后续抽到配置）
const POST_DELAY_MS = 2000 // 非流式期文字推进延迟
// 统一使用延时推进，避免流式期立即推进导致跳过等待
// 空闲超时改为从配置获取（单位：秒），此处仅保留一个最小/最大边界与换算
const INACTIVITY_MIN_SEC = 15
const INACTIVITY_MAX_SEC = 300

export const useConversationStore = defineStore('conversation', () => {
  const responseItems = ref<PetResponseItemWithAudio[]>([])
  const currentMessage = ref('')
  const petState = usePetStateStore()
  const vitsConfig = useVitsConfigStore()
  const aiConfig = useAIConfigStore()

  const isStreaming = ref(false)
  const isTooling = ref(false)
  const currentAudio = ref<HTMLAudioElement | null>(null)
  const autoPlayTimerId = ref<number | null>(null)
  const inactivityTimerId = ref<number | null>(null)
  const lastActivityAt = ref<number>(Date.now())
  const abortAfterStream = ref(false)

  // 根据配置计算空闲超时（毫秒），并做边界保护
  function getInactivityTimeoutMs(): number {
    const sec = Math.max(
      INACTIVITY_MIN_SEC,
      Math.min(INACTIVITY_MAX_SEC, aiConfig.inactivityTimeoutSec)
    )
    return sec * 1000
  }

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

  // 统一的推进入口：根据 currentAudio/展示位状态决定立即或延迟推进
  function maybeConsume() {
    // 1) 正在播音频：等待 onended 再推进
    if (currentAudio.value) return

    // 2) 展示位为空且有队列：立即播放下一条
    if (!currentMessage.value && responseItems.value.length > 0) {
      playNext()
      return
    }

    // 3) 展示位非空：统一延时推进，保证至少等待 POST_DELAY_MS
    if (responseItems.value.length > 0 && isAutoPlayEnabled()) {
      scheduleNext(POST_DELAY_MS)
    }
  }

  function start() {
    isStreaming.value = true
    abortAfterStream.value = false
    touchActivity()
  }

  function setTooling(flag: boolean) {
    isTooling.value = !!flag
    // 工具调用期不计入空闲超时，因此切换时重置活跃时间
    touchActivity()
  }

  async function addItem(item: PetResponseItem) {
    const itemWithAudio: PetResponseItemWithAudio = { ...item }
    if (vitsConfig.on && vitsConfig.baseURL) {
      try {
        // 根据引擎类型和语言设置选择要生成语音的文本
        let textForVoice: string
        if (vitsConfig.engineType === 'bert-vits2') {
          // Bert-VITS2: 根据bv2Lang配置选择文本
          switch (vitsConfig.bv2Lang) {
            case 'zh':
              textForVoice = item.message // 使用中文
              debug(`正在为中文文本生成语音: ${textForVoice}`)
              break
            case 'ja':
              textForVoice = item.japanese // 使用日语
              debug(`正在为日语文本生成语音: ${textForVoice}`)
              break
            case 'en':
              textForVoice = item.message // 使用中文作为英文的fallback
              debug(`正在为英文文本生成语音: ${textForVoice}`)
              break
            default:
              textForVoice = item.japanese // 默认使用日语
              debug(`正在为默认日语文本生成语音: ${textForVoice}`)
          }
        } else {
          // Style-Bert-VITS2: 保持原有逻辑，使用日语
          textForVoice = item.japanese
          debug(`正在为日语文本生成语音: ${textForVoice}`)
        }
        
        if (textForVoice) {
          const audioBlob = await voiceVits(textForVoice)
          itemWithAudio.audioBlob = audioBlob
          debug('语音生成成功')
        }
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
      petState.setPetEmotion(getDefaultEmotionCode())
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
    isTooling.value = false
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
    petState.setPetEmotion(getDefaultEmotionCode())
    isStreaming.value = false
    isTooling.value = false
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
    const timeoutMs = getInactivityTimeoutMs()
    inactivityTimerId.value = window.setTimeout(() => {
      inactivityTimerId.value = null
      const now = Date.now()
      const elapsed = now - lastActivityAt.value
      // 工具调用过程中不计入空闲超时
      if (isTooling.value) {
        scheduleInactivityWatch()
        return
      }
      if (elapsed < timeoutMs) {
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
    }, timeoutMs)
  }

  function touchActivity() {
    lastActivityAt.value = Date.now()
    scheduleInactivityWatch()
  }

  // 当设置的空闲超时时长变化时，重新安排监听
  watch(
    () => aiConfig.inactivityTimeoutSec,
    () => {
      scheduleInactivityWatch()
    }
  )

  return {
    // state
    isStreaming,
    isTooling,
    currentMessage,
    responseItems,
    // actions
    start,
    setTooling,
    addItem,
    finish,
    playNext,
    playAudio,
    cancelAutoPlay,
    clearAll,
    stopToIdle,
    cancelInactivityWatch
  }
})
