// Stub onTask implementation. You can implement your own logic here.
// It will be called automatically when a scheduled item is due.
import { chatForSchedule } from '../chatAndVoice/chatForSchedule'
import { useConversationStore } from '../../stores/conversation'

export async function onTask(prompt: string): Promise<void> {
  const now = Date.now()
  console.log('[onTask] invoked', { prompt, now })

  // 使用会话编排与现有的流式通道进行输出
  const conversation = useConversationStore()
  try {
    // 若当前在流式中（可能来自用户主动聊天），为了安全起见打印日志并暂不并行
    if (conversation.isStreaming) {
      console.log('[onTask] conversation busy, skip execute this round')
      return
    }

    conversation.start()
    const res = await chatForSchedule(prompt, conversation.addItem)
    if (!res.success) {
      // Schedule 场景：失败时静默，只记录日志，不主动显示错误气泡
      console.warn('[onTask] schedule chat failed:', res.error)
    }
  } catch (e) {
    console.error('[onTask] failed', e)
  } finally {
    conversation.finish()
  }
}
