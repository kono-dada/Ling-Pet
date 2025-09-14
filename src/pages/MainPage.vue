<script setup lang="ts">
import { onMounted, ref, watchEffect, onUnmounted, watch } from 'vue';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalSize } from '@tauri-apps/api/dpi';
import Avatar from '../components/main/Avatar.vue';
import Live2DAvatar from '../components/main/Live2DAvatar.vue';
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
import { getPetFixManager } from '../services/petFixManager';
import { useScheduleStore } from '../stores/schedule.ts';

const contextMenuRef = ref();
const ac = useAppearanceConfigStore();
const window = getCurrentWebviewWindow();
const { startWindowListMaintaining, stopWindowListMaintaining } = windowListMaintainer();
const { startChatBubbleWatching, stopChatBubbleWatching } = chatBubbleManager();
const globalHandlersManager = createGlobalHandlersManager();
const vitsConfig = useVitsConfigStore();
const petFixManager = getPetFixManager();

// 监听Avatar类型变化
watch(() => ac.avatarType, (newType) => {
  // 当切换到Live2D模式时，默认关闭装饰并设置边界类型为无边界
  if (newType === 'live2d') {
    ac.decorationType = 'none';
    ac.live2dBorderType = 'none';
  }
});

// 监听固定桌宠状态变化
watch(() => ac.isPetFixed, async (isFixed) => {
  try {
    if (isFixed) {
      console.log('启用固定桌宠功能 - 设置窗口透过');
      // 不需要重新启动UIohook，只需要更新透过状态
      // UIohook已经在onMounted中启动
    } else {
      console.log('禁用固定桌宠功能 - 设置窗口不透过');
      // 不停止UIohook，保持右键菜单功能
      // 只需要确保窗口不透过
    }
  } catch (error) {
    console.error('切换固定桌宠状态失败:', error);
    // 如果失败，重置状态
    ac.isPetFixed = false;
  }
});

onMounted(async () => {
  try {
    useMemoryStore().$tauri.start();
    useHypothesesStore().$tauri.start();
    
    registerDefaultTools()
    startPetSizeWatching();  // 监听设置中的宠物大小以实时调整窗口
    startChatBubbleWatching();  // 监听聊天气泡状态以打开或关闭
    globalHandlersManager.start(); // 根据设置注册/管理全局事件处理
    startWindowListMaintaining();  // 实时更新当前窗口状态
    
    // 始终启动UIohook监听以支持右键菜单功能
    try {
      await petFixManager.startPetFix();
      console.log('✅ UIohook监听启动成功，支持右键菜单功能');
    } catch (error) {
      console.error('⚠️ UIohook监听启动失败:', error);
    }
    
    if (vitsConfig.autoStartSbv2) {
      startSbv2(vitsConfig.installPath);
    }
    
    // 启动"长时间无交互"监视器（默认 1 分钟触发一次）
    startNoInteractionWatcher();
    
    try {
      await ensureDefaultEmotionPack()
      await initEmotionPack()
    } catch (err) { 
      console.error('初始化情绪包失败：', err) 
    }

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
  } catch (error) {
    console.error('MainPage初始化失败:', error)
  }
});

onUnmounted(async () => {
  stopPetSizeWatcher?.();
  stopChatBubbleWatching();
  globalHandlersManager.stop();
  stopWindowListMaintaining();
  stopNoInteractionWatcher();
  
  // 清理固定桌宠功能
  try {
    await petFixManager.destroy();
  } catch (error) {
    console.error('清理固定桌宠功能失败:', error);
  }
});

let stopPetSizeWatcher: (() => void) | null = null;

/**
 * 设置窗口为正方形
 */
async function setWindowToSquare() {
  try {
    await window.setSize(new LogicalSize(ac.petSize, ac.petSize + 30));
  } catch (error) {
    console.error('设置窗口大小失败:', error)
  }
}

/**
 * 处理右键菜单事件
 */
function handleContextMenu(event: MouseEvent) {
  const isDevToolsEnabled = ac.showDevTools ?? false;
  
  // 通知桌宠固定管理器菜单即将显示
  petFixManager.setContextMenuVisible(true);
  
  // 显示自定义右键菜单
  contextMenuRef.value?.showMenu(event);
  
  // 如果开发者工具未开启，阻止默认右键菜单
  if (!isDevToolsEnabled) {
    event.preventDefault();
    event.stopPropagation();
  }
}

/**
 * 启动宠物大小监听
 */
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
       @selectstart.prevent="!(ac.showDevTools ?? false)"
       @dragstart.prevent="!(ac.showDevTools ?? false)"> <!-- 防止滚轮事件导致滚动，自定义右键菜单处理 -->
    <!-- 装饰组件调度 -->
    <DecorationsHost />
    <!-- 根据配置选择Avatar类型 -->
    <Avatar v-if="ac.avatarType === 'image' && ac.decorationType !== 'fallingStars'" />
    <Live2DAvatar v-else-if="ac.avatarType === 'live2d'" />
    <!-- FallingStars装饰需要在Avatar之后渲染 -->
    <div v-if="ac.decorationType === 'fallingStars'" class="falling-stars-container">
      <Avatar />
    </div>
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

/* Falling stars container */
.falling-stars-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>