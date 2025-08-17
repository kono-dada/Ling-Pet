import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { watchEffect } from "vue";
import { useConversationStore } from "../../stores/conversation";
import { storeToRefs } from 'pinia'

const cs = useConversationStore();
const { currentMessage } = storeToRefs(cs)

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

// 聊天气泡管理：有当前消息则打开/显示气泡窗口，无消息则关闭。
export function chatBubbleManager() {
  let stopChatBubbleWatcher: (() => void) | null = null;

  function startChatBubbleWatching() {
    if (!stopChatBubbleWatcher) {
      stopChatBubbleWatcher = watchEffect(async () => {
        const msg = currentMessage.value;
        const chatBubbleWindow = await WebviewWindow.getByLabel('chat-bubble')
        if (chatBubbleWindow) {
          if (!msg) await chatBubbleWindow.close();  // 如果没有消息，关闭气泡窗口
          else if (!await chatBubbleWindow.isVisible()) await chatBubbleWindow.show();  // 如果有消息且窗口不可见，显示气泡窗口
        } else if (msg) openChatBubble();  // 如果没有窗口但有消息，创建新的气泡窗口
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
