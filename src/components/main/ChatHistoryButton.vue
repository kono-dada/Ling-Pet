<template>
  <button
    class="chat-history-button"
    @click.stop.prevent="openChatHistory"
    @mousedown.stop.prevent
    @mouseup.stop.prevent
    title="查看聊天记录"
  >
    <v-icon size="18">mdi-message-text-outline</v-icon>
  </button>
</template>

<script lang="ts" setup>
import { getAllWebviewWindows, WebviewWindow } from '@tauri-apps/api/webviewWindow';

async function openChatHistory() {
  const allWindows = await getAllWebviewWindows();
  const chatHistoryWindow = allWindows.find(window => window.label === 'chat-history');
  if (chatHistoryWindow) {
    chatHistoryWindow?.close();
    return;
  }
  const chatHistoryWindowConfig = {
    title: '聊天记录',
    url: '/#/chat-history',
    label: 'chat-history',
    width: 600,
    height: 700,
    resizable: true,
    transparent: false,
    decorations: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    center: false,
    visible: false,
  };
  new WebviewWindow('chat-history', {
    ...chatHistoryWindowConfig,
    visible: true
  });
}
</script>

<style scoped>
.chat-history-button {
  position: absolute;
  top: 10%;
  left: 10%;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(5px);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.chat-history-button:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(255, 255, 255, 1);
  transform: scale(1.1);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.3);
  opacity: 1;
}
</style>