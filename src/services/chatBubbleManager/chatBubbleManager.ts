import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { watchEffect } from "vue";
import { useChatBubbleStateStore } from "../../stores/chatBubbleState";

const cbs = useChatBubbleStateStore();

function openChatBubble() {
  const chatBubbleConfig = {
    title: '聊天气泡',
    url: '/#/chat-bubble',
    label: 'chat-bubble',
    resizable: false,
    transparent: true,
    decorations: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    center: false,
    visible: false,
    shadow: false
  };
  new WebviewWindow('chat-bubble', chatBubbleConfig);
}

// 聊天气泡管理。如果chatBubbleStateStore中有当前消息，则打开气泡窗口；如果没有消息，则关闭气泡窗口。
export function chatBubbleManager() {
  let stopChatBubbleWatcher: (() => void) | null = null;

  function startChatBubbleWatching() {
    if (!stopChatBubbleWatcher) {
      stopChatBubbleWatcher = watchEffect(async () => {
        const currentMessage = cbs.currentMessage;
        const chatBubbleWindow = await WebviewWindow.getByLabel('chat-bubble')
        if (chatBubbleWindow) {
          if (!currentMessage) await chatBubbleWindow.close();  // 如果没有消息，关闭气泡窗口
          else if (!await chatBubbleWindow.isVisible()) await chatBubbleWindow.show();  // 如果有消息且窗口不可见，显示气泡窗口
        } else if (currentMessage) openChatBubble();  // 如果没有窗口但有消息，创建新的气泡窗口
      });
    }
  }

  function stopChatBubbleWatching() {
    if (stopChatBubbleWatcher) {
      stopChatBubbleWatcher();
      stopChatBubbleWatcher = null;
    }
  }

  return {
    startChatBubbleWatching,
    stopChatBubbleWatching
  };
}