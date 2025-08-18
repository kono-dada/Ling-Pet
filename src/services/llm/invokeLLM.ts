import type { AIMessage } from '../../types/ai'
import { callAIStream } from '../chatAndVoice/aiService'
import { createPetResponseChunkHandler, createToolCallChunkHandler } from '../chatAndVoice/chunkHandlers'
import type { ExecToolResult } from '../tools/types'
import { callToolByName } from '../tools'
import { useConversationStore } from '../../stores/conversation'

export interface InvokeLLMParams {
  // 由调用方构造：system + 历史 + 包裹后的 user
  messages: AIMessage[]
  // 最大迭代次数（默认 2）
  maxIterations?: number
}

type PendingTool = {
  name: string
  args: string[]
  startedAt: number
  promise: Promise<ExecToolResult>
}

export async function invokeLLM(params: InvokeLLMParams): Promise<AIMessage[]> {
  const maxIterations = params.maxIterations ?? 2
  const messagesForLLM: AIMessage[] = params.messages.slice() // copy to mutate for iterations
  const transcript: AIMessage[] = [] // 返回给调用方的对话片段（assistant/tool 序列）
  // 工具执行统一走 callToolByName（工具层已统一返回 ExecToolResult）
  const conversation = useConversationStore()

  const responsePieces: string[] = []

  let iterations = 0
  // 迭代：不中断流；一轮结束后等待工具，依据 continue 决定是否继续
  while (iterations < maxIterations) {
    iterations++

    const pending: PendingTool[] = []

    // 解析 <item>：推送到 onItem
    const petHandler = createPetResponseChunkHandler(conversation.addItem)

    // 解析 <tool>：立即启动工具执行，剔除已处理的 <tool> 块
    const toolHandler = createToolCallChunkHandler(async (name, args) => {
      try {
        const p = callToolByName(name, args)
        pending.push({ name, args, startedAt: Date.now(), promise: p })
      } catch (e) {
        // 若发生同步异常，压入一个失败的占位 Promise，确保后续流程一致
        const failed: ExecToolResult = { ok: false, error: String(e), continue: false }
        pending.push({ name, args, startedAt: Date.now(), promise: Promise.resolve(failed) })
      }
      // 不阻塞流：立即返回成功占位
      return { success: true, result: '' }
    })

    const r = await callAIStream(messagesForLLM, [petHandler, toolHandler])
    if (!r.success) {
      // 失败时，结束并返回已积累的 transcript（不额外注入错误消息）
      return transcript
    }
    responsePieces.push(r.response)
    // 本轮 assistant 文本消息
    const assistantMsg: AIMessage = { role: 'assistant', content: r.response }
    transcript.push(assistantMsg)
    messagesForLLM.push(assistantMsg)

    // 若本轮没有工具调用，达到终止态
    if (pending.length === 0) {
      break
    }

    // 等待所有工具结束
    const results = await Promise.allSettled(pending.map(p => p.promise))

    // 汇总工具调用记录并判断是否需要继续
    let needContinue = false
    const resultItems: Array<{ name: string; ok: boolean; data?: string; error?: string }> = []

    results.forEach((res, idx) => {
      const { name } = pending[idx]
      if (res.status === 'fulfilled') {
        const v = res.value
        if (v.continue === true) needContinue = true
        resultItems.push({ name, ok: v.ok, data: v.result, error: v.error })
      } else {
        resultItems.push({ name, ok: false, error: String(res.reason) })
      }
    })

    // 以 tool 消息的形式注入所有工具结果，并纳入 transcript
    const toolMessages: AIMessage[] = resultItems.map(it => ({
      role: 'tool',
      tool_call_id: '',
      content: JSON.stringify({ name: it.name, ok: it.ok, result: it.data, error: it.error })
    }))
    transcript.push(...toolMessages)
    messagesForLLM.push(...toolMessages)

    if (!needContinue) {
      // 终止态：不再追加轮次
      break
    }
  }

  return transcript
}

// 不再构造 <tools_results>，改为使用 role='tool' 的消息注入工具结果
