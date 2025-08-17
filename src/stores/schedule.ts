import { defineStore } from 'pinia'
import { onTask } from '../services/schedule/onTask'
import { onOutdated } from '../services/schedule/onOutdated'

type TaskStatus = 'scheduled' | 'pending' | 'running' | 'outdated' | 'accomplished' | 'canceled'

export interface ScheduleTaskResult {
  type: 'executed' | 'outdated' | 'canceled'
  error?: string
}

export interface ScheduleTask {
  id: string
  prompt: string
  scheduledAt: number // 计划执行时间（ms）
  outdatedAt?: number // 过期时间（ms）
  createdAt: number
  startedAt?: number
  finishedAt?: number
  status: TaskStatus
  result?: ScheduleTaskResult
}

function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const DEFAULT_HEARTBEAT_MS = 5000

export const useScheduleStore = defineStore('schedule', {
  state: () => ({
    tasks: [] as ScheduleTask[],
    isBusy: false as boolean,
    heartbeatTimerId: null as number | null,
    heartbeatIntervalMs: DEFAULT_HEARTBEAT_MS as number,
    maxTasksPerBeat: 1 as number,
  }),
  actions: {
    addSchedule(delayMs: number, prompt: string, options?: { outdatedInMs?: number }): string {
      const now = Date.now()
      const scheduledAt = now + Math.max(0, Math.floor(delayMs || 0))
      const outdatedAt = options?.outdatedInMs != null ? scheduledAt + Math.max(0, Math.floor(options.outdatedInMs)) : undefined
      const task: ScheduleTask = {
        id: genId(),
        prompt,
        scheduledAt,
        outdatedAt,
        createdAt: now,
        status: 'scheduled',
      }
      this.tasks.push(task)
      console.log('[schedule] addSchedule', { id: task.id, prompt, scheduledAt, outdatedAt, now })
      return task.id
    },

    cancelSchedule(id: string): void {
      const task = this.tasks.find(t => t.id === id)
      if (!task) return
      if (task.status === 'running') return // 不中断正在运行的任务
      if (task.status === 'accomplished' || task.status === 'canceled') return
      task.status = 'canceled'
      task.finishedAt = Date.now()
      task.result = { type: 'canceled' }
    },

    rehydrate(): void {
      this.isBusy = false
      const now = Date.now()
      for (const t of this.tasks) {
        if (t.status === 'running' && !t.finishedAt) {
          // 将悬挂的 running 任务重置，避免卡死
          if (t.outdatedAt && t.outdatedAt <= now) {
            t.status = 'outdated'
          } else {
            t.status = 'pending'
          }
          t.startedAt = undefined
        }
      }
      const stats = this._stats()
      console.log('[schedule] rehydrate done', { now, ...stats })
    },

    startHeartbeat(): void {
      if (this.heartbeatTimerId != null) return
      const id = window.setInterval(() => this._heartbeatSafe(), this.heartbeatIntervalMs)
      this.heartbeatTimerId = id
      console.log('[schedule] heartbeat started', { intervalMs: this.heartbeatIntervalMs })
    },

    stopHeartbeat(): void {
      if (this.heartbeatTimerId != null) {
        clearInterval(this.heartbeatTimerId)
        this.heartbeatTimerId = null
        console.log('[schedule] heartbeat stopped')
      }
    },

    _heartbeatSafe(): void {
      try {
        // console.log('[schedule] heartbeat tick', { now: Date.now() })
        this._heartbeat()
      } catch (e) {
        // 避免异常中断心跳循环
        console.error('schedule heartbeat error:', e)
      }
    },

    _heartbeat(): void {
      const now = Date.now()

      // 1) 推进状态：scheduled -> pending / outdated
      for (const t of this.tasks) {
        if (t.status === 'scheduled' && t.scheduledAt <= now) {
          t.status = 'pending'
          console.log('[schedule] task -> pending', { id: t.id, scheduledAt: t.scheduledAt, now })
        }
        if ((t.status === 'scheduled' || t.status === 'pending') && t.outdatedAt != null && t.outdatedAt <= now) {
          t.status = 'outdated'
          console.log('[schedule] task -> outdated', { id: t.id, outdatedAt: t.outdatedAt, now })
        }
      }

      if (this.isBusy) {
        console.log('[schedule] busy, skip this tick')
        return
      }

      // 2) 选择一个任务执行
      const candidate = this._pickOne(now)
      if (!candidate) {
        // const stats = this._stats()
        // console.log('[schedule] no candidate to run', stats)
        return
      }

      // 3) 执行（严格串行）
      this.isBusy = true
      candidate.status = 'running'
      candidate.startedAt = now
      console.log('[schedule] run start', {
        id: candidate.id,
        status: 'running',
        scheduledAt: candidate.scheduledAt,
        outdatedAt: candidate.outdatedAt,
        now,
      })

      ;(async () => {
        try {
          if (candidate.outdatedAt != null && candidate.outdatedAt <= Date.now()) {
            console.log('[schedule] invoking onOutdated', { id: candidate.id })
            await onOutdated(candidate.prompt, { scheduledAt: candidate.scheduledAt, outdatedAt: candidate.outdatedAt })
            candidate.result = { type: 'outdated' }
          } else {
            console.log('[schedule] invoking onTask', { id: candidate.id })
            await onTask(candidate.prompt)
            candidate.result = { type: 'executed' }
          }
        } catch (err: any) {
          const type = (candidate.outdatedAt != null && candidate.outdatedAt <= Date.now()) ? 'outdated' : 'executed'
          candidate.result = { type, error: err?.message ? String(err.message) : String(err) }
        } finally {
          candidate.finishedAt = Date.now()
          candidate.status = 'accomplished'
          console.log('[schedule] run finish', {
            id: candidate.id,
            result: candidate.result,
            durationMs: (candidate.finishedAt ?? 0) - (candidate.startedAt ?? 0),
            finishedAt: candidate.finishedAt,
          })
          this.isBusy = false
        }
      })()
    },

    _pickOne(_now: number): ScheduleTask | undefined {
      // 优先 outdated，按 outdatedAt 升序
      const outdated = this.tasks
        .filter(t => t.status === 'outdated')
        .sort((a, b) => (a.outdatedAt ?? Infinity) - (b.outdatedAt ?? Infinity))
      if (outdated.length > 0) return outdated[0]

      // 否则 pending，按 scheduledAt 升序
      const pending = this.tasks
        .filter(t => t.status === 'pending')
        .sort((a, b) => a.scheduledAt - b.scheduledAt)
      return pending[0]
    },
    _stats(): Record<string, number> {
      const counts: Record<string, number> = {
        scheduled: 0,
        pending: 0,
        running: 0,
        outdated: 0,
        accomplished: 0,
        canceled: 0,
        total: this.tasks.length,
      }
      for (const t of this.tasks) counts[t.status]++
      return counts
    },
  },
  tauri: {
    saveOnChange: true,
    saveStrategy: 'debounce',
    saveInterval: 300,
  },
})
