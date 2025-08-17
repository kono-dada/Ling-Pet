# LingPet 会话与语音播放架构（建议稿）

本稿旨在为“文本/语音的流式生成、排队、自动播放与交互控制”提供一套职责清晰、可扩展、易测的框架蓝图。当前代码已初步合并为单例会话编排 store，本文在其基础上明确边界、完善时序与策略，以便后续演进。

## 目标与约束
- 目标
  - 单一数据源：所有对话播放状态集中管理，避免多实例与状态分裂。
  - 清晰边界：解析、排队、TTS、播放、调度、UI 各司其职。
  - 可配置：播放节奏、自动播放策略、TTS 策略可调优。
  - 异常可恢复：TTS/音频错误自动降级为文字播放，流式中断有清晰恢复点。
- 约束
  - 单音轨：任一时刻仅播放一个音频（避免混音冲突）。
  - 顺序一致：用户感知的播放顺序与排队顺序一致（除非用户主动跳过）。

## 模块分层
```
+---------------- UI 层 ----------------+
| ChatBubblePage (渲染/打字机/配色)     |
| Input（占位/状态机/提交）            |
| Avatar（点击=跳过/继续、视觉反馈）     |
+---------------- 服务层 --------------+
| ChatBubbleWindowManager（窗口开关/定位）|
| ConversationStore（唯一编排）         |
|  - Queue（入队/出队）                 |
|  - Scheduler（自动播放定时）           |
|  - AudioPlayer（单音轨播放）           |
|  - TTSService（可选的音频生成）        |
|  - Policy（播放/延时/优先级策略）       |
+---------------- 通用层 --------------+
| ChunkHandlers（<item>、<tool>解析）     |
| aiResponse Utils（解析复用）           |
| Config Stores（ai/ui/vits 等）         |
+--------------------------------------+
```

## 核心数据结构
- MessageItem（语义项）
  - 字段：`message: string`、`japanese: string`、`emotion: number`
- QueueItem（播放项）
  - 基于 MessageItem，附加 `audioBlob?: Blob`、`id: string`、`createdAt: number`（可选）
- ConversationStore（单例）
  - `currentMessage: string`（当前展示）
  - `responseItems: QueueItem[]`（待播放队列）
  - `isStreaming: boolean`
  - `currentAudio: HTMLAudioElement | null`
  - `autoPlayTimerId: number | null`

## 状态维度与事件
- 播放维度（PlaybackState）
  - Idle -> Typing -> PlayingAudio -> PostDelay（文字）-> Idle
- 流式维度（StreamState）
  - Inactive -> Streaming -> Inactive
- 关键事件
  - `onItemParsed(item)`（chunk handler 触发）
  - `onEnqueue(item)` -> `onDequeue(next)`
  - `onAudioStarted/Ended/Error`
  - `onSchedule(delay)`/`onCancelSchedule()`
  - `onUserNext()`/`onUserStop()`/`onClear()`

## 播放时序（建议）
- 入队策略（TTS 生成）
  - 默认“音频优先”：入队前尝试 TTS；若 TTS 失败或超时，降级文字。
  - 可选“文字先行，音频补齐”：入队即展示文字，音频就绪后若该条尚未播放且当前无音频，则优先播音频；适合追求“即时反馈”的场景。
- 自动推进策略（重点）
  - 若 `currentAudio` 存在：等待 `onended` 后自动 `playNext()`。
  - 若无音频且 `isStreaming === true`：新消息入队后“立即”推进（`playNext()`），确保流式期的连贯性。
  - 若无音频且非流式：按 `postDelayMs` 延迟推进（文字阅读节奏）。
  - 用户点击（Avatar）：`cancelAutoPlay()` 后 `playNext()`，提供“快进”体验。

## 策略与配置（建议默认值）
- `autoPlayEnabled: boolean`（默认 true）
- `streamImmediate: boolean`（默认 true）
  - 流式期新消息无音频时，立即推进。
- `postDelayMs: number`（默认 1800~2200ms）
  - 非流式期文字消息之间的阅读间隔。
- `ttsTimeoutMs: number`（默认 4~6s）
  - 超时降级为文字。
- `audioErrorPolicy: 'skip' | 'retryOnce'`（默认 skip）
- `onFinishPolicy: 'drain' | 'stop'`（默认 drain）
  - 流式结束后是否继续清空剩余队列。

## ConversationStore API（建议）
- 状态
  - `isStreaming: Ref<boolean>`
  - `currentMessage: Ref<string>`
  - `responseItems: Ref<QueueItem[]>`
  - `isBusy: Computed<boolean>` = `isStreaming || responseItems.length>0 || !!currentAudio`
- 动作
  - `start()` / `finish()`
  - `enqueue(item | items[])`（内部串行/并行 TTS）
  - `playNext()` / `skipCurrent()`
  - `cancelAutoPlay()` / `scheduleAutoPlay(ms)`
  - `clearQueue()` / `clearAll()`
  - `stop()`（立即停止：取消定时器、停止音频、清空队列（或按策略））

## 伪代码（关键逻辑）
```ts
function onItemParsed(item: MessageItem) {
  const qi = await enrichWithTTS(item) // 受 ttsTimeoutMs 约束
  enqueue(qi)

  if (!autoPlayEnabled) return
  if (currentAudio) return // 等待 onended

  if (isStreaming && streamImmediate) {
    playNext() // 立即推进
  } else {
    scheduleAutoPlay(postDelayMs) // 非流式：节奏化推进
  }
}

function playNext() {
  cancelAutoPlay()
  const next = responseItems.shift()
  if (!next) { if (!isStreaming) currentMessage = ''; return }

  currentMessage = next.message
  setEmotion(next.emotion)
  if (next.audioBlob) playAudio(next.audioBlob)
  else if (autoPlayEnabled) {
    if (isStreaming && streamImmediate) playNext() // 连续文字：紧凑推进
    else scheduleAutoPlay(postDelayMs)
  }
}

function finish() {
  isStreaming = false
  // onFinishPolicy: drain -> 保持推进; stop -> cancelAutoPlay()
}
```

## UI 交互协议
- Input 状态
  - `isBusy` -> placeholder: “思考中/点击继续”
  - 忽略 Enter（除非空闲）
- Avatar 点击
  - `cancelAutoPlay()` + `skipCurrent()`（或 `playNext()`）
  - 记录最近交互时间，插件（如屏幕分析）可基于节流策略绕开干扰
- ChatBubblePage
  - 仅负责渲染、打字机动画与配色
  - 窗口定位/尺寸由 WindowManager 负责（独立服务方便迁移）

## 错误与边界
- TTS 失败/超时：记录日志 -> 文字回退 -> 按策略推进
- Audio 播放失败：记录日志 -> `playNext()`
- 流式失败：在 UI 显示错误文案，并回落默认情绪；`finish()` 后按 `onFinishPolicy` 处理队列
- 资源清理：所有 `URL.createObjectURL` 必须在 `onended/onerror/catch` 统一 `revokeObjectURL`

## 测试建议
- 单元测试
  - 解析 `<item>`、调度策略（即时/延时/流式/非流式）、错误分支（TTS/AUDIO）
- 集成测试
  - 多条 item 顺序、用户点击跳过、配置切换（autoPlay、postDelayMs）

## 迁移现状与差距
- 已完成
  - 单例 `ConversationStore`、解析工具复用、移除多实例 composable、清理冗余 store
- 建议补全
  - `isBusy` 计算属性
  - 策略参数收口（`postDelayMs/streamImmediate/onFinishPolicy` 等）到配置
  - `finish()`/`stop()` 语义明确化
  - （可选）TTS 异步补齐模式
  - （可选）将 ChatBubble 窗口定位/尺寸逻辑迁至 WindowManager 服务

---

以上为可迭代的目标架构。实际落地可分阶段实施：先补 `isBusy` 与策略参数，再细化 `finish/stop` 语义和 WindowManager 抽离。若需要，我可以按本文逐步提交实现 PR。

