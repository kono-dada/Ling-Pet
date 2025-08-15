<script setup lang="ts">
import { onMounted, ref, watchEffect, onUnmounted } from 'vue';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalSize } from '@tauri-apps/api/dpi';
import Avatar from '../components/main/Avatar.vue';
import Input from '../components/main/Input.vue';
import SettingButton from '../components/main/SettingButton.vue';
import ChatHistoryButton from '../components/main/ChatHistoryButton.vue';
import DecorationsHost from '../components/main/decorations/DecorationsHost.vue';
import { useAppearanceConfigStore } from '../stores/appearanceConfig';
import { windowListMaintainer } from '../services/screenAnalysis/windowListMaintainer';
import { chatBubbleManager } from '../services/chatBubbleManager/chatBubbleManager';
import { createGlobalHandlersManager } from '../services/events/globalHandlers';
import { useVitsConfigStore } from '../stores/vitsConfig';
import { startSbv2 } from '../services/chatAndVoice/sbv2Process';
import { initEmotionPack, ensureDefaultEmotionPack } from '../services/emotionPack.ts';

const avatarRef = ref();
const ac = useAppearanceConfigStore();
const window = getCurrentWebviewWindow();
const { startWindowListMaintaining, stopWindowListMaintaining } = windowListMaintainer();
const { startChatBubbleWatching, stopChatBubbleWatching } = chatBubbleManager();
const globalHandlersManager = createGlobalHandlersManager();
const vitsConfig = useVitsConfigStore();

onMounted(async () => {
  startPetSizeWatching();  // 监听设置中的宠物大小以实时调整窗口
  startChatBubbleWatching();  // 监听聊天气泡状态以打开或关闭
  await globalHandlersManager.start(); // 根据设置注册/管理全局事件处理
  startWindowListMaintaining();  // 实时更新当前窗口状态
  if (vitsConfig.autoStartSbv2) {
    await startSbv2(vitsConfig.installPath);
  }
  try {
    await ensureDefaultEmotionPack()
    await initEmotionPack()
  } catch (err) { console.error('初始化情绪包失败：', err) }
});

onUnmounted(() => {
  stopPetSizeWatcher?.();
  stopChatBubbleWatching();
  globalHandlersManager.stop();
  stopWindowListMaintaining();
});

let stopPetSizeWatcher: (() => void) | null = null;
// 设置窗口为正方形
async function setWindowToSquare() {
  window.setSize(new LogicalSize(ac.petSize, ac.petSize + 30));
}

async function startPetSizeWatching() {
  await setWindowToSquare();
  if (!stopPetSizeWatcher) {
    stopPetSizeWatcher = watchEffect(async () => {
      await setWindowToSquare();
    });
  }
}

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
