import type { Tool } from '../types';
import { sendNotification } from '@tauri-apps/plugin-notification';

// 工具：延迟后弹出提醒对话框（示例）
export const addNotificationTool: Tool = {
  name: 'addNotification',
  description: '参数：延迟时间（秒）, 提醒内容\n  功能：在指定的时间后发送提醒通知',
  async call(delaySecondsRaw, contentRaw) {
    const delaySeconds = Number(delaySecondsRaw);
    const safeDelay = Number.isFinite(delaySeconds) && delaySeconds >= 0 ? delaySeconds : 0;
    const content = String(contentRaw ?? '').trim();

    setTimeout(() => {
      // fire-and-forget
      sendNotification({ title: '灵灵提醒', body: content });
      console.log(`Notification sent after ${safeDelay} seconds: ${content}`);
    }, safeDelay * 1000);

    return { scheduledInSeconds: safeDelay, content };
  },
};
