import type { Tool } from '../types';
import { useScheduleStore } from '../../../stores/schedule';

// 工具：添加一个定时任务（串行心跳调度）
// 参数：delay（秒）, outdated（秒，可选/空字符串表示不设过期）, prompt（字符串）
export const addScheduleTool: Tool = {
  name: 'addSchedule',
  description:
    '参数：延迟时间（秒）, 过期时间（秒，-1表示不过期）, 任务内容（字符串，这是你要提醒你自己在未来要做的事情，比如“我需要做xxx”。这个任务内容可以写的很详细）\n  功能：添加一个定时器，到时间会提醒你执行你自己定下的任务。如果这个任务具有时效性，你可以添加过期时间。',
  async call(delaySecRaw, outdatedSecRaw, promptRaw) {
    console.log('[tool:addSchedule] start', { delaySecRaw, outdatedSecRaw, promptRaw });
    const schedule = useScheduleStore();

    // 解析 delay
    const delaySec = Number(delaySecRaw);
    const safeDelaySec = Number.isFinite(delaySec) && delaySec >= 0 ? delaySec : 0;

    // 解析 outdated：-1 表示不过期；空字符串/未传也视为不过期
    let safeOutdatedSec: number | undefined = undefined;
    if (outdatedSecRaw !== undefined && outdatedSecRaw !== null && String(outdatedSecRaw).trim() !== '') {
      const n = Number(outdatedSecRaw);
      if (Number.isFinite(n)) {
        if (n === -1) {
          safeOutdatedSec = undefined;
        } else if (n >= 0) {
          safeOutdatedSec = n;
        }
      }
    }

    const prompt = String(promptRaw ?? '').trim();

    const id = schedule.addSchedule(safeDelaySec * 1000, prompt, {
      outdatedInMs: safeOutdatedSec !== undefined ? safeOutdatedSec * 1000 : undefined,
    });

    const task = schedule.tasks.find(t => t.id === id);
    console.log('[tool:addSchedule] created', {
      id,
      prompt,
      scheduledAt: task?.scheduledAt,
      outdatedAt: task?.outdatedAt,
      now: Date.now(),
    });
    return {
      id,
      scheduledAt: task?.scheduledAt,
      outdatedAt: task?.outdatedAt,
      prompt,
    };
  },
};
