<script setup lang="ts">
import { onMounted, ref, watchEffect, nextTick, } from 'vue';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalSize } from '@tauri-apps/api/dpi';
import Avatar from '../components/main/Avatar.vue';
import Input from '../components/main/Input.vue';
import SettingButton from '../components/main/SettingButton.vue';
import decorations from '../components/main/Decorations.vue';
import { useAppearanceConfigStore } from '../stores/appearanceConfig';
import { useChatBubbleStateStore } from '../stores/chatBubbleState';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

const avatarRef = ref();
const ac = useAppearanceConfigStore();
const cbs = useChatBubbleStateStore();
const window = getCurrentWebviewWindow();

// 设置窗口为正方形
async function setWindowToSquare() {
  window.setSize(new LogicalSize(ac.petSize, ac.petSize + 30));
}

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

onMounted(async () => {
  await setWindowToSquare();
  watchEffect(async () => {  // 监听 petSize 的变化， 确保窗口大小同步更新
    await window.setSize(new LogicalSize(ac.petSize, ac.petSize + 30));
    // 触发装饰元素的重新渲染，否则位置会出问题
    if (ac.showDecorations) {
      ac.showDecorations = false;
      await nextTick();
      ac.showDecorations = true;
    }
  });
  // 管理聊天气泡的打开和关闭
  watchEffect(async () => {
    const currentMessage = cbs.currentMessage;
    const chatBubbleWindow = await WebviewWindow.getByLabel('chat-bubble')
    if (chatBubbleWindow) {
      if (!currentMessage) await chatBubbleWindow.close();  // 如果没有消息，关闭气泡窗口
      else if (!await chatBubbleWindow.isVisible()) await chatBubbleWindow.show();  // 如果有消息且窗口不可见，显示气泡窗口
    } else if (currentMessage) openChatBubble();  // 如果没有窗口但有消息，创建新的气泡窗口
  });
});

</script>

<template>
  <div class="main-wrapper" :style="{ opacity: ac.opacity }" @wheel.prevent> <!-- 防止滚轮事件导致滚动 -->
    <decorations />
    <Avatar ref="avatarRef" />
    <SettingButton class="settings-button" />
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

.main-wrapper:hover .settings-button,
.main-wrapper:focus-within .settings-button {
  opacity: 1;
}
</style>