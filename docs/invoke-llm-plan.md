# invokeLLM 设计与落地计划（更新稿）

目标：抽象一个通用的 LLM 调用编排器 `invokeLLM`，让 `chatWithPet` 与 `scheduleForPet` 都调用它，只在“传入的初始消息（Messages）”与“工具执行器（execTool）”上不同。`invokeLLM` 不处理历史记录和权限策略；仅负责把一次对话推进到“终止态”。

终止态定义：
- 本轮流式输出未产生任何 `<tool>` 调用；或
- 产生了 `<tool>` 调用，所有工具执行完毕并回传结果后，如果“聚合的工具结果”中不包含 `continue=true`，则终止；若包含 `continue=true`，则将“所有工具结果”作为一条新消息加入对话，再进入下一轮（有迭代上限）。

## 核心思路
- 职责分离：
  - `chatWithPet` / `scheduleForPet`：负责拼装 system / history / 包裹后的 user 消息；决定是否写历史与如何显示错误；并提供 `execTool`（可在此处决定允许或忽略哪些工具，不在 invokeLLM 内做 policy）。
  - `invokeLLM`：负责流式消费 + 收集 `<tool>` 调用；在流结束后并发执行工具，汇总结果；若需继续则把工具结果回注为新一轮输入。
- 无中断流：不在出现 `<tool>` 时打断流。流结束后统一处理工具，再决定是否进入下一轮。

## API 设计
```ts
export interface InvokeLLMParams {
  messages: AIMessage[] // 完整消息（system + history + user 包裹）
  onItem: (item: PetResponseItem) => Promise<void> // 解析到 <item> 的回调
  maxIterations?: number // 默认 2~3 次
}

export interface InvokeLLMResult {
  success: boolean
  error?: string
  iterations: number
  toolCalls: Array<{ name: string; args: string[]; ok: boolean }>
  responseText: string // LLM 本轮的完整文本（便于调用方决定是否写历史）
}

export async function invokeLLM(params: InvokeLLMParams): Promise<InvokeLLMResult>
```

## 流程（单轮 → 可迭代，非中断）
1) 使用 `callAIStream(messages, handlers)` 启动流式：
   - `createPetResponseChunkHandler(onItem)`：将 `<item>` 流式推送到对话播放队列。
   - `collectToolsHandler`：解析 `<tool>` 调用，收集到 `toolCalls[]`，并从 buffer 中剔除 `<tool>` 区块（避免污染 `responseText`）。
2) 流结束：若 `toolCalls` 为空，达到终止态，返回；否则并发执行所有工具（内部统一通过 `callToolByName` 调用工具）。
   - 收集结果数组 `toolResults[]`，并计算是否有任意 `continue === true`。
3) 若 `continue !== true`：达到终止态，返回聚合结果。
4) 若需要继续：构造一个 XML 反馈，作为新一轮输入消息（role: 'user'）：
   ```xml
   <tools_results>
     <continue>true</continue>
     <results>
       <result>
         <name>memoryAdd</name>
         <ok>true</ok>
         <data>{"id":"abc123"}</data>
       </result>
       ...
     </results>
   </tools_results>
   ```
   在 `messages` 末尾 push 新消息后，进入下一轮（迭代计数+1，受 `maxIterations` 限制）。

## chat vs. schedule 的使用方式
- chatWithPet：
  - 构建 messages：system（格式 + 人设）+（可选）history + `USER_PROMPT_WRAPPER` 包裹的用户消息。
  - 工具调用：由 invokeLLM 内部统一通过 `callToolByName` 触发。
  - 错误展示、历史写入：在 chatWithPet 内部完成。

- scheduleForPet：
  - 构建 messages：system（格式 + 人设）+ `SCHEDULE_PROMPT_WRAPPER` 包裹的任务消息，不拼历史。
  - 工具：无需在外部处理，invokeLLM 统一经 `callToolByName` 调用。若希望“禁止工具”，可在工具实现中返回 `ok:false, continue:false` 或不注册该工具。
  - 错误：外部决定是否静默。

## 对现有代码的最小侵入改造
- 新增：`src/services/llm/invokeLLM.ts`：实现上述 API 与流程，内含 `collectToolsHandler`。
- 复用：`createPetResponseChunkHandler`；`callAIStream` 无需改动（不再需要“中断”能力）。
- 封装：
  - `chatWithPet`：组装 messages → 调用 `invokeLLM` → 自己处理历史/错误。
  - `scheduleForPet`：组装 messages → 调用 `invokeLLM` → 自己处理错误（多为静默）。
- Prompt（建议）：
  - 在 `getResponseFormatPrompt()` 中补充：模型输出 `<tool>` 后无需等待回复，完整输出本轮 `<messages>` 即可；系统会在需要时注入 `<tools_results>` 让你继续。

## 任务清单（实施顺序）
1. 新增 `invokeLLM.ts`：定义类型与主循环（流式收集 tool → 并发执行 → 决定是否继续 → 注入 `<tools_results>` 进入下一轮）。
2. 新增 `collectToolsHandler`：解析 `<tool>`、收集 name/args、从 buffer 中剔除 `<tool>` 块。
3. 改造 `chatWithPet`/`scheduleForPet`：改为组装 messages + 提供 execTool → 调用 `invokeLLM`。
4. （可选）更新 Prompt 规范：明确 `<tool>` → `<tools_results>` 的交互方式（非中断流）。
5. 验证：
   - Chat 场景：工具闭环（memoryAdd → `<tools_results>` → 若需要继续则二轮对话）。
   - Schedule 场景：默认禁用工具；失败静默；不写历史。
   - 迭代上限与“continue=false”终止生效。

---
本方案与约束一致：
- invokeLLM 不处理历史与权限；只推进对话到“终止态”。
- 不中断 LLM 流；在流结束后统一处理工具并决定是否继续。
- chat 与 schedule 仅在 messages 与 execTool 上不同，便于统一维护。
