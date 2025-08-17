# 调度系统（Schedule）设计文档

## 目标与约束
- 可靠：应用重启后不丢任务，保证到期任务最终被处理。
- 严格串行：任务不能并发执行；同一时刻最多执行一个任务。
- 可观测：有清晰的状态机与时间戳，便于追踪与排错。
- 可扩展：任务数量增长时仍可高效运作；可替换策略（排序、过期策略）。

## 核心概念与状态机
- 状态（status）
  - `scheduled`：已计划，等待到时进入待执行队列。
  - `pending`：已进入待执行队列，等待被调度执行。
  - `running`：正在执行（严格保证只有一个任务处于该状态）。
  - `outdated`：已超过过期时间，待执行过期处理逻辑。
  - `accomplished`：终态；无论按时执行或过期处理完成，都会进入该状态。
  - `canceled`：被显式取消（可作为终态，通常不进入 accomplished）。

- 典型状态迁移
  - `scheduled` —(到达计划时间)—> `pending`
  - `pending` —(到达过期时间且尚未运行)—> `outdated`
  - `pending` —(被心跳挑选执行)—> `running` —(完成)—> `accomplished`
  - `outdated` —(被心跳挑选执行过期处理)—> `accomplished`
  - 任意非终态 —(用户取消)—> `canceled`

> 说明：用户提出“所有执行或过期的任务最终都到达 accomplished”，本文遵循该约束；`canceled` 作为显式终止的独立终态。

## 数据模型（建议）
- 持久化字段（Pinia + Tauri 存储）
  - `id: string`
  - `prompt: string`
  - `scheduledAt: number` 任务计划时间（ms since epoch）
  - `outdatedAt?: number` 任务过期时间（ms since epoch，可选）
  - `createdAt: number`
  - `startedAt?: number` 实际开始执行时间
  - `finishedAt?: number` 实际完成时间
  - `status: 'scheduled'|'pending'|'running'|'outdated'|'accomplished'|'canceled'`
  - `result?: { type: 'executed'|'outdated'|'canceled'; error?: string }`

- 仅内存字段（不持久化）
  - `isBusy: boolean` 是否正在运行某个任务
  - `heartbeatTimerId: number | null` 心跳 `setInterval` 的句柄
  - `pendingQueue: string[]` 待执行任务的 ID 队列（也可以按需从持久化状态推导）

> 说明：`pendingQueue` 可选持久化。简单起见，可以每次心跳通过扫描 `status` 推导队列，避免复杂度。

## 心跳（Heartbeat）机制
- 周期：默认每 15s 触发一次（可配置 `heartbeatIntervalMs`）。
- 每次心跳的步骤（单线程串行）：
  1. 收集到期任务：将所有 `status = scheduled` 且 `scheduledAt <= now` 的任务标记为 `pending`；将所有 `status in {scheduled,pending}` 且 `outdatedAt <= now` 的任务标记为 `outdated`。
  2. 如果 `isBusy = true`，跳过执行阶段，仅完成状态更新与持久化，等待下个周期。
  3. 如果空闲，从 `pending` 或 `outdated` 中挑选一个任务执行（见“调度顺序”）。
  4. 将被挑选任务置为 `running`，记录 `startedAt = now`，设置 `isBusy = true`。
  5. 执行：
     - 若任务为 `pending`：调用 `onTask(prompt)`。
     - 若任务为 `outdated`：调用 `onOutdated(prompt, { scheduledAt, outdatedAt })`。
     - 无论成功或抛错，均在 `finally` 中记录 `finishedAt = now`，`status = accomplished`，并填充 `result`（若有错误，写入 `error` 字段）。
  6. 将 `isBusy = false`，等待下一个心跳周期处理下一个任务。

- 节流策略：默认“每个心跳最多执行 1 个任务”（`maxTasksPerBeat = 1`）。若未来需要更高吞吐，可将其设为 >1，但仍应保证串行（分批连续执行，而非并发）。

## 过期（Outdated）处理
- `outdatedAt` 表达任务的最后处理时限：
  - 当心跳发现 `outdatedAt <= now` 且任务尚未完成，则将其标记为 `outdated` 并进入过期处理分支。
- `onOutdated`：过期处理回调，与 `onTask` 分离，便于做不同的业务逻辑（如发不同的提示）。
- 最终态：过期处理完成后同样进入 `accomplished`，并将 `result.type = 'outdated'`。

## 并发控制与一致性
- 全局互斥：通过 `isBusy` 控制；进入 `running` 时置为 `true`，完成后置回 `false`。
- 运行中崩溃恢复：
  - 启动时 `rehydrate()`：将所有 `status = running` 且未 `finishedAt` 的任务重置为 `pending`（或按 `outdatedAt` 重新判断为 `outdated`），避免“卡死”。
  - 所有状态变更在关键节点持久化，保证可恢复性。

## 启动与重启流程
- 应用启动后：
  1. 创建（或获取）Pinia store；
  2. 调用 `rehydrate()`：
     - 将“未完成的非终态”根据 `scheduledAt/outdatedAt` 重新标记为 `scheduled/pending/outdated`；
     - 将 `running` 且未完成的任务重置；
  3. 启动心跳定时器 `setInterval(heartbeat, heartbeatIntervalMs)`。

## 调度顺序（默认策略）
- 选择器（当空闲时）按以下优先级取 1 个任务：
  1. 所有 `outdated` 中按 `outdatedAt` 升序最早者；
  2. 若无过期任务，则在 `pending` 中按 `scheduledAt` 升序最早者。
- 该策略保证“尽快处理已过期任务”，同时对正常到期任务遵循先到先服务。

## API 设计（建议）
- `addSchedule(delayMs: number, prompt: string, options?: { outdatedInMs?: number }): string`
  - 计算 `scheduledAt = now + delayMs`；若提供 `outdatedInMs`，则 `outdatedAt = scheduledAt + outdatedInMs`。
  - 初始状态为 `scheduled`。
- `cancelSchedule(id: string): void`
  - 将任务标记为 `canceled`（终态，不会进入 `accomplished`）。
- `rehydrate(): void`
  - 重启后进行状态重建与清理（含将“悬挂的 running”重置为 `pending/outdated`）。
- `startHeartbeat(): void` / `stopHeartbeat(): void`
  - 控制心跳定时器生命周期。
- Hooks（服务层，供业务实现）：
  - `onTask(prompt: string): Promise<void>`
  - `onOutdated(prompt: string, ctx: { scheduledAt: number; outdatedAt?: number }): Promise<void>`

## 持久化策略
- 使用现有 `@tauri-store/pinia` 插件的 `saveOnChange` + `debounce`。
- 持久化“任务列表与其状态”；不持久化“心跳句柄、运行时队列、isBusy”。
- 启动时通过 `rehydrate()` 恢复。

## 错误处理
- `onTask`/`onOutdated` 异常时：
  - 捕获并写入 `result.error`；
  - 仍将任务置为 `accomplished`，避免重复执行。
- 可选重试：若需要重试，可扩展 `retryCount/maxRetries/backoff` 字段与逻辑。

## 性能与规模
- 心跳收敛：默认每拍处理 1 个任务，避免启动时积压造成突发压力。
- 扫描优化：
  - 任务量较小时，直接扫描数组足够简单；
  - 规模较大时，可维护最小堆（按 `scheduledAt/outdatedAt`）或按状态分桶以 O(log n) 插入/取出。

## 与当前实现的差异与迁移
- 现状：按任务设置 `setTimeout`，到点立即执行；可能导致并行执行与崩溃后丢执行。
- 新方案：
  - 移除每任务的 `setTimeout`，使用全局 `heartbeat` 串行调度；
  - 新增字段：`status/scheduledAt/outdatedAt/startedAt/finishedAt/result`；
  - 新增 Hook：`onOutdated`；
  - `rehydrate()` 负责状态纠偏与恢复。

## 示例流程
- T1: 调用 `addSchedule(30s, '喝水')`，`scheduledAt = now+30s`，`status = scheduled`。
- … 30s 后一个心跳到来：进入 `pending`。
- 心跳发现空闲，取该条 `pending`，置 `running`，调用 `onTask('喝水')`，结束后置 `accomplished`。
- 若在 `scheduledAt+15s` 仍未被执行并设置了 `outdatedAt = scheduledAt+15s`，则在心跳中会先标记为 `outdated`，随后执行 `onOutdated` 再 `accomplished`。

## 伪代码（核心循环）
```ts
function heartbeat() {
  const now = Date.now()

  // 1) 转移到 pending/outdated
  for (const t of tasks) {
    if (t.status === 'scheduled' && t.scheduledAt <= now) t.status = 'pending'
    if ((t.status === 'scheduled' || t.status === 'pending') && t.outdatedAt && t.outdatedAt <= now) t.status = 'outdated'
  }

  if (isBusy) return

  // 2) 挑一个任务
  const candidate = pickOne() // 优先 outdated，再 pending，时间最早
  if (!candidate) return

  isBusy = true
  candidate.status = 'running'
  candidate.startedAt = now

  ;(async () => {
    try {
      if (candidate.status === 'outdated') {
        await onOutdated(candidate.prompt, { scheduledAt: candidate.scheduledAt, outdatedAt: candidate.outdatedAt })
        candidate.result = { type: 'outdated' }
      } else {
        await onTask(candidate.prompt)
        candidate.result = { type: 'executed' }
      }
    } catch (e:any) {
      candidate.result = { type: candidate.status === 'outdated' ? 'outdated' : 'executed', error: String(e?.message ?? e) }
    } finally {
      candidate.finishedAt = Date.now()
      candidate.status = 'accomplished'
      isBusy = false
    }
  })()
}
```

## 可选优化
- 配置项：`heartbeatIntervalMs`、`maxTasksPerBeat`、`timeSkewToleranceMs`、`pickStrategy`。
- 日志：记录每次心跳处理数量与耗时，异常告警。
- 防抖/抖动：在启动时稍作随机延迟，避免多窗口同时心跳造成负载尖峰（如有多实例）。

## 落地建议（下一步）
- 在现有 `schedule` store 中：
  - 引入上述状态与字段；
  - 移除每任务 `setTimeout`；
  - 实现 `rehydrate()` 与 `startHeartbeat()`；
  - 新增 `onOutdated` hook（`src/services/schedule/onOutdated.ts`）。
- 在 `main.ts` 启动时调用 `rehydrate()` 和 `startHeartbeat()`。
- 保持与现有持久化插件配置一致，确保数据可靠保存。

---
以上设计保证“严格串行 + 心跳驱动 + 可过期处理 + 可恢复”，在简单清晰的同时具备扩展空间。如需，我可以基于该文档直接改造当前 store 实现。
