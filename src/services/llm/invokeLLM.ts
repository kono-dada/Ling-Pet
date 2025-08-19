import type { AIMessage } from '../../types/ai'
import { callAIStream } from '../chatAndVoice/aiService'
import { createPetResponseChunkHandler, createToolCallChunkHandler } from '../chatAndVoice/chunkHandlers'
import type { ExecToolResult, ToolResultMessageContent } from '../tools/types'
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

type ToolCall = {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
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
    const toolCalls: ToolCall[] = []

    // 解析 <item>：推送到 onItem
    const petHandler = createPetResponseChunkHandler(conversation.addItem)

    // 解析 <tool>：立即启动工具执行，剔除已处理的 <tool> 块
    const toolHandler = createToolCallChunkHandler(async (name, args) => {
      // 为本次工具调用生成一个与 assistant.tool_calls 对应的 id
      const id = `tool_${Date.now()}_${toolCalls.length}`
      // 规范化 arguments：若已为字符串则直接使用，否则序列化
      const argStr = typeof args === 'string'
        ? args
        : Array.isArray(args)
          ? JSON.stringify(args.length === 1 ? args[0] : args)
          : JSON.stringify(args ?? {})
      // 记录本轮将要注入到 assistant 消息里的 tool_calls
      toolCalls.push({
        id,
        type: 'function',
        function: { name, arguments: argStr }
      })
      // 不中断流；callToolByName 已内部兜底错误并返回 ExecToolResult
      const p = callToolByName(name, args)
      pending.push({ name, args, startedAt: Date.now(), promise: p })
      return
    })

    const r = await callAIStream(messagesForLLM, [petHandler, toolHandler])
    if (!r.success) {
      // 失败时，结束并返回已积累的 transcript（不额外注入错误消息）
      return transcript
    }
    responsePieces.push(r.response)
    // 若模型在本轮触发了工具调用，则把 tool_calls 一并注入到 assistant 消息
    const assistantMsg: AIMessage = toolCalls.length > 0
      ? { role: 'assistant', content: r.response, tool_calls: toolCalls }
      : { role: 'assistant', content: r.response }
    transcript.push(assistantMsg)
    messagesForLLM.push(assistantMsg)

    // 若本轮没有工具调用，达到终止态
    if (pending.length === 0) {
      break
    }

    // 标记：使用工具中
    try {
      const conversation = useConversationStore()
      conversation.setTooling(true)
    } catch {}

    // 等待所有工具结束
    const results = await Promise.allSettled(pending.map(p => p.promise))

    // 清除标记
    try {
      const conversation = useConversationStore()
      conversation.setTooling(false)
    } catch {}
    console.log('工具调用结果:', results)

    // 汇总工具调用记录并判断是否需要继续
    let needContinue = false
    const resultItems: Array<ToolResultMessageContent> = []

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
    const toolMessages: AIMessage[] = resultItems.map((it, idx) => ({
      role: 'tool',
      tool_call_id: toolCalls[idx]?.id || '',
      content: JSON.stringify(it)
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

// 重要：为每个工具调用生成并回传 tool_call_id
// 先在本轮 assistant 消息中注入 tool_calls，然后用 role='tool' 的消息按顺序回填同 id 的结果
