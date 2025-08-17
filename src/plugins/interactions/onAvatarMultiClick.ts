import { useConversationStore } from '../../stores/conversation';
import type { PetResponseItem } from '../../types/ai';
import { EMOTION_CODE_MAP } from '../../constants/emotions';

// 测试辅助：等待函数
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 生成简单的静音 WAV 音频 Blob，用于模拟音频播放（约 16kHz, 16-bit, mono）
function createSilentWavBlob(durationMs = 600): Blob {
  const sampleRate = 16000
  const numSamples = Math.floor((durationMs / 1000) * sampleRate)
  const bytesPerSample = 2 // 16-bit
  const dataSize = numSamples * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  // RIFF header
  let offset = 0
  function writeString(s: string) {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
    offset += s.length
  }
  function writeUint32(v: number) { view.setUint32(offset, v, true); offset += 4 }
  function writeUint16(v: number) { view.setUint16(offset, v, true); offset += 2 }

  writeString('RIFF')
  writeUint32(36 + dataSize)
  writeString('WAVE')
  writeString('fmt ') // fmt chunk
  writeUint32(16) // 16 for PCM
  writeUint16(1)  // PCM
  writeUint16(1)  // mono
  writeUint32(sampleRate)
  writeUint32(sampleRate * bytesPerSample) // byte rate
  writeUint16(bytesPerSample) // block align
  writeUint16(8 * bytesPerSample) // bits per sample
  writeString('data')
  writeUint32(dataSize)

  // data: 全零 = 静音
  // 已经是 0 初始化，无需写入
  return new Blob([buffer], { type: 'audio/wav' })
}

// 构建一个 PetResponseItem
function item(zh: string, emotionName: keyof typeof EMOTION_CODE_MAP, ja = ''): PetResponseItem {
  return { message: zh, japanese: ja, emotion: EMOTION_CODE_MAP[emotionName] }
}

// 轮换不同的测试场景
let scenarioIndex = 0

export async function handleAvatarMultiClick(_payload: { ts: number; threshold: number; windowMs: number }) {
  const c = useConversationStore()
  scenarioIndex = (scenarioIndex + 1) % 5

  switch (scenarioIndex) {
    // 场景 0：流式紧凑文字——立刻推进
    case 0: {
      c.start()
      await c.addItem(item('【S0-1】我来了，这是第一句', '开心'))
      await sleep(3000)
      await c.addItem(item('【S0-2】第二句紧跟着出现', '正常'))
      await sleep(3000)
      await c.addItem(item('【S0-3】第三句也来了', '兴奋'))
      c.finish()
      break
    }
    // 场景 1：非流式文字——按延时推进
    case 1: {
      c.finish() // 确保 isStreaming=false
      await c.addItem(item('【S1-1】非流式：看我会延时推进', '正常'))
      await c.addItem(item('【S1-2】第二条（应有阅读间隔）', '思考'))
      await c.addItem(item('【S1-3】第三条（仍延时推进）', '无语'))
      break
    }
    // 场景 2：音频门控——播放一段静音音频，队列等音频结束后继续
    case 2: {
      c.start()
      // 当前展示位给一条提示，并开始静音音频来门控
      c.currentMessage = '【S2-AUDIO】先听完这段假装的语音...'
      c.playAudio(createSilentWavBlob(3000))
      // 音频期间入队的消息，应在音频结束后再推进
      await sleep(200)
      await c.addItem(item('【S2-1】音频结束后我先来', '正常'))
      await c.addItem(item('【S2-2】然后到我', '开心'))
      c.finish()
      break
    }
    // 场景 3：混合：先流式、途中结束，再继续入队（应从立即→延时切换）
    case 3: {
      c.start()
      await c.addItem(item('【S3-1】流式开始，立即推进', '兴奋'))
      await c.addItem(item('【S3-2】还是立即推进', '开心'))
      c.finish() // 流式结束
      await c.addItem(item('【S3-3】现在应该延时推进了', '思考'))
      await c.addItem(item('【S3-4】继续延时推进', '正常'))
      break
    }
    // 场景 4：用户快进测试：模拟用户点击=立即推进
    default: {
      c.finish()
      await c.addItem(item('【S4-1】正常延时推进（可点头像快进）', '正常'))
      await c.addItem(item('【S4-2】再来一条（同样可快进）', '正常'))
      break
    }
  }
}
