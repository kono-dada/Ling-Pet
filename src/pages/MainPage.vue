<script setup lang="ts">
import { onMounted, ref, watchEffect, onUnmounted, } from 'vue';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalSize } from '@tauri-apps/api/dpi';
import Avatar from '../components/main/Avatar.vue';
import Input from '../components/main/Input.vue';
import SettingButton from '../components/main/SettingButton.vue';
import ChatHistoryButton from '../components/main/ChatHistoryButton.vue';
import DecorationsHost from '../components/main/decorations/DecorationsHost.vue';
import { useAppearanceConfigStore } from '../stores/appearanceConfig';
import { useChatBubbleStateStore } from '../stores/chatBubbleState';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useCurrentWindowListStore } from '../stores/currentWindowList';
import { getScreenshotableWindows } from '../services/screenAnalysisService';

const avatarRef = ref();
const ac = useAppearanceConfigStore();
const cbs = useChatBubbleStateStore();
const currentWindowList = useCurrentWindowListStore()
const window = getCurrentWebviewWindow();

// 设置窗口为正方形
async function setWindowToSquare() {
  window.setSize(new LogicalSize(ac.petSize, ac.petSize + 30));
}

// 每五秒刷新窗口状态
async function updataWindowState() {
  const windows = await getScreenshotableWindows();
  const newWindows = currentWindowList.update(windows);
  // 如果非空就log
  if (newWindows.length > 0) {
    console.log('新增窗口列表:', newWindows);
  }
}
let intervalId: number | undefined;

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

let stopPetSizeWatcher: (() => void) | null = null;
let stopChatBubbleWatcher: (() => void) | null = null;
onMounted(async () => {
  await setWindowToSquare();
  stopPetSizeWatcher = watchEffect(async () => {  // 监听 petSize 的变化， 确保窗口大小同步更新
    await window.setSize(new LogicalSize(ac.petSize, ac.petSize + 30));
  });
  // 管理聊天气泡的打开和关闭
  stopChatBubbleWatcher = watchEffect(async () => {
    const currentMessage = cbs.currentMessage;
    const chatBubbleWindow = await WebviewWindow.getByLabel('chat-bubble')
    if (chatBubbleWindow) {
      if (!currentMessage) await chatBubbleWindow.close();  // 如果没有消息，关闭气泡窗口
      else if (!await chatBubbleWindow.isVisible()) await chatBubbleWindow.show();  // 如果有消息且窗口不可见，显示气泡窗口
    } else if (currentMessage) openChatBubble();  // 如果没有窗口但有消息，创建新的气泡窗口
  });
  intervalId = setInterval(() => {
    updataWindowState();
  }, 5000);
});

onUnmounted(() => {
  stopPetSizeWatcher?.();
  stopChatBubbleWatcher?.();
  if (intervalId !== undefined) clearInterval(intervalId);
});

</script>

<template>
  <div class="main-wrapper" :style="{ opacity: ac.opacity }" @wheel.prevent> <!-- 防止滚轮事件导致滚动 -->
  <!-- 装饰组件调度 -->
  <DecorationsHost />
    <ChatHistoryButton class="button" />
    <Avatar ref="avatarRef" />
    <SettingButton class="button" />
    <Input class="input" />
  </div>
</template>

<style scoped>
.main-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  overscroll-behavior: none;
  padding: 5px;

  /* 防止图片被选中和拖拽 */
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-user-drag: none;
  /* 防止图片加载时的闪烁 */
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}

/* 鼠标悬停时显示按钮和输入框 */
.main-wrapper:hover .input,
.main-wrapper:focus-within .input {
  opacity: 0.95;
}

.main-wrapper:hover .button,
.main-wrapper:focus-within .button {
  opacity: 1;
}
</style>