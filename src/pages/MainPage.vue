<script setup lang="ts">
import { onMounted, ref, watchEffect, onUnmounted } from 'vue';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalSize } from '@tauri-apps/api/dpi';
import Avatar from '../components/main/Avatar.vue';
import Input from '../components/main/Input.vue';
import DecorationsHost from '../components/main/decorations/DecorationsHost.vue';
import ContextMenu from '../components/main/ContextMenu.vue';
import { useAppearanceConfigStore } from '../stores/configs/appearanceConfig';
import { windowListMaintainer } from '../services/screenAnalysis/windowListMaintainer';
import { chatBubbleManager } from '../services/chatBubbleManager/chatBubbleManager';
import { createGlobalHandlersManager } from '../services/events/globalHandlers';
import { useVitsConfigStore } from '../stores/configs/vitsConfig.ts';
import { startSbv2 } from '../services/chatAndVoice/sbv2Process';
import { initEmotionPack, ensureDefaultEmotionPack } from '../services/emotionPack.ts';
import { registerDefaultTools } from '../services/tools/index.ts';
import { startNoInteractionWatcher, stopNoInteractionWatcher } from '../services/interactions/noInteractionWatcher';
import { useMemoryStore } from '../stores/memory.ts';
import { useHypothesesStore } from '../stores/hypotheses.ts';
import { useScheduleStore } from '../stores/schedule.ts';

const avatarRef = ref();
const contextMenuRef = ref();
const ac = useAppearanceConfigStore();
const window = getCurrentWebviewWindow();
const { startWindowListMaintaining, stopWindowListMaintaining } = windowListMaintainer();
const { startChatBubbleWatching, stopChatBubbleWatching } = chatBubbleManager();
const globalHandlersManager = createGlobalHandlersManager();
const vitsConfig = useVitsConfigStore();

onMounted(async () => {
  useMemoryStore().$tauri.start();
  useHypothesesStore().$tauri.start();
  
  registerDefaultTools()
  startPetSizeWatching();  // 监听设置中的宠物大小以实时调整窗口
  startChatBubbleWatching();  // 监听聊天气泡状态以打开或关闭
  globalHandlersManager.start(); // 根据设置注册/管理全局事件处理
  startWindowListMaintaining();  // 实时更新当前窗口状态
  if (vitsConfig.autoStartSbv2) {
    startSbv2(vitsConfig.installPath);
  }
  // 启动“长时间无交互”监视器（默认 1 分钟触发一次）
  startNoInteractionWatcher();
  try {
    await ensureDefaultEmotionPack()
    await initEmotionPack()
  } catch (err) { console.error('初始化情绪包失败：', err) }


  // Initialize schedule manager: restore state and start heartbeat
  try {
    const schedule = useScheduleStore()
    console.log('[schedule] init: start storage + rehydrate + startHeartbeat')
    schedule.$tauri.start()
    schedule.rehydrate()
    schedule.startHeartbeat()
  } catch (e) {
    console.error('Failed to initialize schedule manager:', e)
  }
});

onUnmounted(() => {
  stopPetSizeWatcher?.();
  stopChatBubbleWatching();
  globalHandlersManager.stop();
  stopWindowListMaintaining();
  stopNoInteractionWatcher();
});

let stopPetSizeWatcher: (() => void) | null = null;
// 设置窗口为正方形
async function setWindowToSquare() {
  window.setSize(new LogicalSize(ac.petSize, ac.petSize + 30));
}

// 处理右键菜单事件
function handleContextMenu(event: MouseEvent) {
  // 如果开发者工具开启，使用默认的右键菜单
  if (ac.showDevTools) {
    return;
  }
  
  // 阻止默认右键菜单
  event.preventDefault();
  event.stopPropagation();
  
  // 显示自定义右键菜单
  if (contextMenuRef.value) {
    contextMenuRef.value.showMenu(event);
  }
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
  <div class="main-wrapper" 
       :style="{ opacity: ac.opacity }" 
       @wheel.prevent
       @contextmenu="handleContextMenu"
       @selectstart.prevent="!ac.showDevTools"
       @dragstart.prevent="!ac.showDevTools"> <!-- 防止滚轮事件导致滚动，自定义右键菜单处理 -->
    <!-- 装饰组件调度 -->
    <DecorationsHost />
    <Avatar ref="avatarRef" />
    <Input class="input" />
    
    <!-- 自定义右键菜单 -->
    <ContextMenu ref="contextMenuRef" />
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
